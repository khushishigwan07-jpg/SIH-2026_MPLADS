import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import pg from "pg";
import process from "node:process";

dotenv.config({ override: true });

const { Pool } = pg;
const app = express();

app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const allowedReviewStatuses = [
  "Pending Review",
  "Verified",
  "Clarification Requested",
  "Escalated",
  "False Positive",
];

// =====================================================
// 1. DASHBOARD SUMMARY
// =====================================================

app.get("/api/dashboard-summary", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) AS total_projects,

        COUNT(*) FILTER (
          WHERE recommended_date IS NOT NULL
        ) AS recommended_projects,

        COUNT(*) FILTER (
          WHERE sanctioned_date IS NOT NULL
        ) AS sanctioned_projects,

        COUNT(*) FILTER (
          WHERE completion_status = 'Completed'
        ) AS completed_projects,

        COUNT(*) FILTER (
          WHERE completion_status <> 'Completed'
        ) AS pending_projects,

        COUNT(*) FILTER (
          WHERE completion_status <> 'Completed'
            AND days_since_sanction_as_of_2026_08_27 > 500
        ) AS pending_over_500_days,

        COUNT(*) FILTER (
          WHERE risk_level = 'Critical'
        ) AS critical_risk_projects,

        ROUND(
          100.0 * COUNT(*) FILTER (
            WHERE completion_status = 'Completed'
          ) / NULLIF(
            COUNT(*) FILTER (
              WHERE recommended_date IS NOT NULL
            ),
            0
          ),
          1
        ) AS completion_rate

      FROM maharashtra_dashboard_ready;
    `);

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Dashboard summary error:", error);

    res.status(500).json({
      error: "Could not load dashboard summary.",
    });
  }
});

// =====================================================
// 2. ALL OFFICER PROJECTS
// Historical records + New Prototype Submissions
//
// IMPORTANT:
// Original `projects` table is NOT modified.
// =====================================================

app.get("/api/projects", async (req, res) => {
  try {
    // -------------------------------------------------
    // Historical Maharashtra records
    // -------------------------------------------------

    const historicalResult = await pool.query(`
      SELECT
        work_id,
        location,
        project_description,
        suggested_category,
        current_stage,
        completion_status,
        delay_risk_score,
        risk_level,
        verification_status
      FROM maharashtra_dashboard_ready
      ORDER BY work_id;
    `);

    const historicalProjects = historicalResult.rows.map(
      (project) => ({
        ...project,

        record_type: "Historical Record",

        project_title:
          project.project_description ||
          "MPLADS Public Work",

        public_status:
          project.completion_status ||
          project.current_stage ||
          "Status not recorded",
      })
    );

    // -------------------------------------------------
    // New prototype submissions
    // -------------------------------------------------

    const submissionResult = await pool.query(`
      SELECT
        ps.id,
        ps.work_id,
        ps.project_description,
        ps.location,
        ps.implementing_agency,
        ps.recommended_date,
        ps.sanctioned_date,
        ps.recommended_amount,
        ps.sanctioned_amount,
        ps.current_stage,
        ps.completion_status,
        ps.suggested_category,
        ps.category_confidence,
        ps.category_reason,
        ps.category_review_status,
        ps.risk_score,
        ps.risk_level,
        ps.risk_reasons,
        COALESCE(
          pr.verification_status,
          ps.verification_status,
          'Pending Review'
        ) AS verification_status,
        ps.created_at
      FROM project_submissions ps
      LEFT JOIN project_reviews pr
        ON pr.work_id = ps.work_id
      ORDER BY ps.created_at DESC;
    `);

    const submittedProjects = submissionResult.rows.map(
      (project) => ({
        ...project,

        record_type: "New Prototype Submission",

        project_title:
          project.project_description ||
          "New MPLADS Project",

        public_status:
          project.completion_status ||
          project.current_stage ||
          "Status not recorded",

        // Officer Dashboard expects this field.
        delay_risk_score:
          project.risk_score ?? 0,
      })
    );

    // -------------------------------------------------
    // Combine both datasets
    // -------------------------------------------------

    const combinedProjects = [
      ...historicalProjects,
      ...submittedProjects,
    ];

    res.json(combinedProjects);
  } catch (error) {
    console.error("Projects API error:", error);

    res.status(500).json({
      error: "Could not load projects.",
    });
  }
});

// =====================================================
// 3. PROJECT DETAILS
// =====================================================

app.get("/api/project", async (req, res) => {
  try {
    const { workId } = req.query;

    if (!workId) {
      return res.status(400).json({
        error: "A work ID is required.",
      });
    }

    // -------------------------------------------------
    // Historical Maharashtra data
    // -------------------------------------------------

    const historicalResult = await pool.query(
      `
        SELECT *
        FROM maharashtra_dashboard_ready
        WHERE work_id = $1;
      `,
      [workId]
    );

    if (historicalResult.rows.length > 0) {
      return res.json({
        ...historicalResult.rows[0],
        record_type: "Historical Record",
      });
    }

    // -------------------------------------------------
    // New prototype submission
    // -------------------------------------------------

    const submissionResult = await pool.query(
      `
        SELECT
          ps.*,
          COALESCE(
            pr.verification_status,
            ps.verification_status,
            'Pending Review'
          ) AS verification_status,
          pr.officer_note
        FROM project_submissions ps
        LEFT JOIN project_reviews pr
          ON pr.work_id = ps.work_id
        WHERE ps.work_id = $1;
      `,
      [workId]
    );

    if (submissionResult.rows.length === 0) {
      return res.status(404).json({
        error: "Project not found.",
      });
    }

    const project = submissionResult.rows[0];

    res.json({
      ...project,

      completion_status:
        project.current_stage === "Completed"
          ? "Completed"
          : project.completion_status || "Pending",

      delay_risk_score:
        project.risk_score ?? 0,

      record_type:
        "New Prototype Submission",
    });
  } catch (error) {
    console.error("Project details error:", error);

    res.status(500).json({
      error: "Could not load project details.",
    });
  }
});

// =====================================================
// 4. PROJECT REVIEW
// Officer verification / escalation / clarification
// =====================================================

app.post("/api/project/review", async (req, res) => {
  try {
    const {
      workId,
      verificationStatus,
      officerNote,
    } = req.body;

    if (!workId || !verificationStatus) {
      return res.status(400).json({
        error:
          "Work ID and verification status are required.",
      });
    }

    if (
      !allowedReviewStatuses.includes(
        verificationStatus
      )
    ) {
      return res.status(400).json({
        error: "Invalid verification status.",
      });
    }

    const result = await pool.query(
      `
        INSERT INTO project_reviews (
          work_id,
          verification_status,
          officer_note
        )
        VALUES ($1, $2, $3)
        RETURNING *;
      `,
      [
        workId,
        verificationStatus,
        officerNote || null,
      ]
    );

    res.json({
      message: "Project review saved successfully.",
      review: result.rows[0],
    });
  } catch (error) {
    console.error("Project review error:", error);

    res.status(500).json({
      error: "Could not save project review.",
    });
  }
});

// =====================================================
// 5. AI TEXT CATEGORISATION
// =====================================================

function analyseProjectDescription(description) {
  const text = String(description || "").toLowerCase();

  const categoryRules = [
    {
      category: "Roads & Infrastructure",
      keywords: [
        "road",
        "link road",
        "pathway",
        "bridge",
        "culvert",
        "drainage",
      ],
    },

    {
      category: "Water & Sanitation",
      keywords: [
        "water",
        "pipeline",
        "borewell",
        "irrigation",
        "sewage",
        "toilet",
      ],
    },

    {
      category: "Education",
      keywords: [
        "school",
        "classroom",
        "college",
        "library",
        "smartboard",
        "projector",
      ],
    },

    {
      category: "Health",
      keywords: [
        "hospital",
        "health",
        "clinic",
        "ambulance",
        "medical",
      ],
    },

    {
      category: "Community Facilities",
      keywords: [
        "community hall",
        "community center",
        "auditorium",
        "guest house",
        "open stage",
      ],
    },

    {
      category: "Environment & Plantation",
      keywords: [
        "plantation",
        "tree",
        "environment",
        "green belt",
      ],
    },

    {
      category: "Sports & Recreation",
      keywords: [
        "playground",
        "sports",
        "gymnasium",
        "stadium",
      ],
    },

    {
      category: "Transport Facilities",
      keywords: [
        "bus shed",
        "bus stop",
        "waiting shed",
      ],
    },

    {
      category: "Railway-related Community Works",
      keywords: [
        "railway",
        "station",
        "platform",
      ],
    },
  ];

  let bestMatch = {
    category: "Other Public Works",
    matchedKeywords: [],
  };

  for (const rule of categoryRules) {
    const matchedKeywords = rule.keywords.filter(
      (keyword) => text.includes(keyword)
    );

    if (
      matchedKeywords.length >
      bestMatch.matchedKeywords.length
    ) {
      bestMatch = {
        category: rule.category,
        matchedKeywords,
      };
    }
  }

  const confidence =
    bestMatch.matchedKeywords.length === 0
      ? 55
      : Math.min(
          95,
          65 +
            bestMatch.matchedKeywords.length * 10
        );

  const reason =
    bestMatch.matchedKeywords.length === 0
      ? "No strong category keywords were identified. Officer confirmation is required."
      : `Matched project-description terms: ${bestMatch.matchedKeywords.join(
          ", "
        )}.`;

  return {
    category: bestMatch.category,
    confidence,
    reason,
  };
}

app.post("/api/ai/categorise", (req, res) => {
  const { projectDescription } = req.body;

  if (
    !projectDescription ||
    !projectDescription.trim()
  ) {
    return res.status(400).json({
      error:
        "Please enter a project description for categorisation.",
    });
  }

  const analysis =
    analyseProjectDescription(
      projectDescription
    );

  res.json(analysis);
});

// =====================================================
// 6. INITIAL RISK ANALYSIS
// =====================================================

function calculateInitialRisk(
  recommendedDate,
  sanctionedDate,
  currentStage
) {
  let riskScore = 0;
  const reasons = [];

  const recommendation = recommendedDate
    ? new Date(recommendedDate)
    : null;

  const sanction = sanctionedDate
    ? new Date(sanctionedDate)
    : null;

  // ---------------------------------------------------
  // Sanction delay
  // ---------------------------------------------------

  if (
    recommendation &&
    sanction &&
    !Number.isNaN(
      recommendation.getTime()
    ) &&
    !Number.isNaN(
      sanction.getTime()
    )
  ) {
    const sanctionDelayDays = Math.floor(
      (sanction - recommendation) /
        (1000 * 60 * 60 * 24)
    );

    if (sanctionDelayDays > 180) {
      riskScore += 20;

      reasons.push(
        "Sanction was delayed by more than 180 days."
      );
    }
  }

  // ---------------------------------------------------
  // Incomplete duration
  // ---------------------------------------------------

  if (
    sanction &&
    !Number.isNaN(sanction.getTime()) &&
    currentStage !== "Completed"
  ) {
    const daysSinceSanction = Math.floor(
      (Date.now() - sanction) /
        (1000 * 60 * 60 * 24)
    );

    if (daysSinceSanction > 500) {
      riskScore += 40;

      reasons.push(
        "Work remains incomplete more than 500 days after sanction."
      );
    } else if (daysSinceSanction > 365) {
      riskScore += 30;

      reasons.push(
        "Work remains incomplete more than 365 days after sanction."
      );
    }
  }

  // Maximum initial risk score
  riskScore = Math.min(
    riskScore,
    40
  );

  let riskLevel = "Low";

  if (riskScore >= 40) {
    riskLevel = "Critical";
  } else if (riskScore >= 30) {
    riskLevel = "High";
  } else if (riskScore >= 20) {
    riskLevel = "Medium";
  }

  return {
    riskScore,
    riskLevel,

    reasons:
      reasons.length > 0
        ? reasons.join(" ")
        : "No immediate delay-based risk indicator was identified.",
  };
}

// =====================================================
// 7. NEW PROJECT SUBMISSION
// =====================================================

app.post(
  "/api/project-submissions",
  async (req, res) => {
    try {
      const {
        workId,
        projectDescription,
        location,
        implementingAgency,
        recommendedDate,
        sanctionedDate,
        recommendedAmount,
        sanctionedAmount,
        currentStage,
        confirmedCategory,
      } = req.body;

      if (
        !workId ||
        !projectDescription ||
        !location
      ) {
        return res.status(400).json({
          error:
            "Work ID, project description, and location are required.",
        });
      }

      // -------------------------------------------------
      // AI categorisation
      // -------------------------------------------------

      const aiAnalysis =
        analyseProjectDescription(
          projectDescription
        );

      const finalCategory =
        confirmedCategory &&
        confirmedCategory.trim()
          ? confirmedCategory.trim()
          : aiAnalysis.category;

      const categoryReviewStatus =
        finalCategory === aiAnalysis.category
          ? "Confirmed"
          : "Corrected";

      // -------------------------------------------------
      // Initial anomaly/risk analysis
      // -------------------------------------------------

      const risk = calculateInitialRisk(
        recommendedDate,
        sanctionedDate,
        currentStage || "Recommended"
      );

      // -------------------------------------------------
      // Save new submission
      // -------------------------------------------------

      const result = await pool.query(
        `
          INSERT INTO project_submissions (
            work_id,
            project_description,
            location,
            implementing_agency,
            recommended_date,
            sanctioned_date,
            recommended_amount,
            sanctioned_amount,
            current_stage,
            suggested_category,
            category_confidence,
            category_reason,
            category_review_status,
            risk_score,
            risk_level,
            risk_reasons
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11,
            $12,
            $13,
            $14,
            $15,
            $16
          )
          RETURNING *;
        `,
        [
          workId,
          projectDescription,
          location,
          implementingAgency || null,
          recommendedDate || null,
          sanctionedDate || null,
          recommendedAmount || null,
          sanctionedAmount || null,
          currentStage || "Recommended",
          finalCategory,
          aiAnalysis.confidence,
          aiAnalysis.reason,
          categoryReviewStatus,
          risk.riskScore,
          risk.riskLevel,
          risk.reasons,
        ]
      );

      res.status(201).json({
        message:
          "New project submitted successfully.",

        project: result.rows[0],
      });
    } catch (error) {
      console.error(
        "Project submission error:",
        error
      );

      if (error.code === "23505") {
        return res.status(409).json({
          error:
            "A project with this Work ID already exists in new submissions.",
        });
      }

      res.status(500).json({
        error:
          "Could not save the new project.",
      });
    }
  }
);

// =====================================================
// 8. CITIZEN PORTAL — PUBLIC SAFE API
//
// Combines:
// A. Historical Maharashtra records
// B. New prototype submissions
//
// IMPORTANT:
// Only public information is returned.
//
// NEVER expose:
// - risk score
// - risk level
// - risk reasons
// - officer notes
// - verification decisions
// - escalation information
// - category confidence
// - category review status
// =====================================================

app.get(
  "/api/citizen/projects",
  async (req, res) => {
    try {
      // -------------------------------------------------
      // 1. Historical Maharashtra records
      // -------------------------------------------------

      const historicalResult = await pool.query(`
        SELECT
          work_id,
          location,
          suggested_category,
          current_stage,
          completion_status,
          project_description
        FROM maharashtra_dashboard_ready
        ORDER BY work_id;
      `);

      const historicalProjects =
        historicalResult.rows.map(
          (project) => ({
            work_id:
              project.work_id,

            project_title:
              project.project_description ||
              "MPLADS Public Work",

            location:
              project.location,

            category:
              project.suggested_category ||
              "Other Public Works",

            current_stage:
              project.current_stage ||
              "Status not recorded",

            public_status:
              project.completion_status ||
              project.current_stage ||
              "Status not recorded",

            record_type:
              "Historical Record",
          })
        );

      // -------------------------------------------------
      // 2. New prototype submissions
      // -------------------------------------------------
      //
      // IMPORTANT:
      // Notice that risk_score, risk_level,
      // risk_reasons, officer notes and verification
      // information are NOT selected.
      // -------------------------------------------------

      const submissionResult = await pool.query(`
        SELECT
          work_id,
          project_description,
          location,
          suggested_category,
          current_stage,
          completion_status,
          created_at
        FROM project_submissions
        ORDER BY created_at DESC;
      `);

      const submittedProjects =
        submissionResult.rows.map(
          (project) => ({
            work_id:
              project.work_id,

            project_title:
              project.project_description ||
              "MPLADS Public Work",

            location:
              project.location,

            category:
              project.suggested_category ||
              "Other Public Works",

            current_stage:
              project.current_stage ||
              "Status not recorded",

            public_status:
              project.completion_status ||
              project.current_stage ||
              "Status not recorded",

            record_type:
              "New Prototype Submission",
          })
        );

      // -------------------------------------------------
      // 3. Combine public datasets
      // -------------------------------------------------

      const combinedProjects = [
        ...historicalProjects,
        ...submittedProjects,
      ];

      res.json(combinedProjects);

    } catch (error) {
      console.error(
        "Citizen projects error:",
        error
      );

      res.status(500).json({
        error:
          "Unable to load public project information.",
      });
    }
  }
);

// =====================================================
// 9. START SERVER
// =====================================================

const PORT =
  process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `API running at http://localhost:${PORT}`
  );
});