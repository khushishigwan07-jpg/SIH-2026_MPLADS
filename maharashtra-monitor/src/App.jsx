import { useEffect, useMemo, useState } from "react";
import "./styles/government.css";

import AddProjectForm from "./components/AddProjectForm";
import RoleGateway from "./pages/RoleGateway";
import CitizenPortal from "./pages/CitizenPortal";

const API = "https://maharashtra-monitor-api.onrender.com";

function formatDate(value) {
  if (!value) return "Not recorded";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not recorded";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function riskClass(level) {
  return String(level || "Low")
    .toLowerCase()
    .replace(/\s+/g, "-");
}

export default function App() {
  // =====================================================
  // ROLE / PAGE STATE
  // =====================================================

  const [selectedRole, setSelectedRole] = useState(null);

  // =====================================================
  // OFFICER DASHBOARD STATE
  // =====================================================

  const [summary, setSummary] = useState(null);
  const [projects, setProjects] = useState([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // =====================================================
  // PROJECT DETAIL / REVIEW STATE
  // =====================================================

  const [selectedProject, setSelectedProject] = useState(null);

  const [projectLoading, setProjectLoading] =
    useState(false);

  const [reviewStatus, setReviewStatus] =
    useState("Pending Review");

  const [officerNote, setOfficerNote] =
    useState("");

  const [reviewSaving, setReviewSaving] =
    useState(false);

  // =====================================================
  // FILTER STATE
  // =====================================================

  const [filters, setFilters] = useState({
    location: "",
    category: "",
    stage: "",
    riskLevel: "",
    search: "",
  });

  // =====================================================
  // LOAD OFFICER DASHBOARD
  // =====================================================

  async function loadDashboard() {
    try {
      setLoading(true);
      setMessage("");

    const [
  summaryResponse,
  projectsResponse,
] = await Promise.all([
  fetch(
    "https://maharashtra-monitor-api.onrender.com/api/dashboard-summary"
  ),
  fetch(
    "https://maharashtra-monitor-api.onrender.com/api/projects"
  ),
]);

      const summaryData =
        await summaryResponse.json();

      const projectsData =
        await projectsResponse.json();

      if (!summaryResponse.ok) {
        throw new Error(
          summaryData.error ||
            "Could not load dashboard summary."
        );
      }

      if (!projectsResponse.ok) {
        throw new Error(
          projectsData.error ||
            "Could not load project data."
        );
      }

      setSummary(summaryData);

      setProjects(
        Array.isArray(projectsData)
          ? projectsData
          : []
      );
    } catch (error) {
      console.error(
        "Dashboard loading error:",
        error
      );

      setMessage(
        error.message ||
          "Could not load Maharashtra project data."
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    void loadDashboard();
  }, []);

  // =====================================================
  // FILTER OPTIONS
  // =====================================================

  const locations = useMemo(() => {
    return [
      ...new Set(
        projects
          .map((item) => item.location)
          .filter(Boolean)
      ),
    ].sort();
  }, [projects]);

  const categories = useMemo(() => {
    return [
      ...new Set(
        projects
          .map(
            (item) =>
              item.suggested_category
          )
          .filter(Boolean)
      ),
    ].sort();
  }, [projects]);

  const stages = useMemo(() => {
    return [
      ...new Set(
        projects
          .map(
            (item) =>
              item.current_stage
          )
          .filter(Boolean)
      ),
    ].sort();
  }, [projects]);

  // =====================================================
  // FILTER PROJECTS
  // =====================================================

  const filteredProjects = useMemo(() => {
    const searchText =
      filters.search
        .trim()
        .toLowerCase();

    return projects.filter((project) => {
      const workId = String(
        project.work_id || ""
      ).toLowerCase();

      const description = String(
        project.project_description || ""
      ).toLowerCase();

      const location = String(
        project.location || ""
      ).toLowerCase();

      const matchesSearch =
        !searchText ||
        workId.includes(searchText) ||
        description.includes(searchText) ||
        location.includes(searchText);

      const matchesLocation =
        !filters.location ||
        project.location ===
          filters.location;

      const matchesCategory =
        !filters.category ||
        project.suggested_category ===
          filters.category;

      const matchesStage =
        !filters.stage ||
        project.current_stage ===
          filters.stage;

      const matchesRisk =
        !filters.riskLevel ||
        project.risk_level ===
          filters.riskLevel;

      return (
        matchesSearch &&
        matchesLocation &&
        matchesCategory &&
        matchesStage &&
        matchesRisk
      );
    });
  }, [projects, filters]);

  // =====================================================
  // OPEN PROJECT DETAILS
  // =====================================================

  async function openProject(workId) {
    setMessage("");
    setSelectedProject(null);
    setProjectLoading(true);

   try {
  const response = await fetch(
    `${API}/api/project?workId=${encodeURIComponent(
      workId
    )}`
  );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Could not load project."
        );
      }

      setSelectedProject(data);

      setReviewStatus(
        data.verification_status ||
          "Pending Review"
      );

      setOfficerNote(
        data.officer_note || ""
      );
    } catch (error) {
      console.error(
        "Project details error:",
        error
      );

      setMessage(
        error.message ||
          "Could not load project details."
      );
    } finally {
      setProjectLoading(false);
    }
  }

  // =====================================================
  // CLOSE PROJECT MODAL
  // =====================================================

  function closeProjectModal() {
    if (reviewSaving) {
      return;
    }

    setSelectedProject(null);
    setOfficerNote("");
    setReviewStatus("Pending Review");
  }

  // =====================================================
  // SAVE OFFICER REVIEW
  // =====================================================

  async function saveReview() {
    if (!selectedProject) {
      return;
    }

    try {
      setReviewSaving(true);
      setMessage("");

      const response = await fetch(
        `${API}/project/review`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            workId:
              selectedProject.work_id,

            verificationStatus:
              reviewStatus,

            officerNote,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Could not save review."
        );
      }

      // Update currently opened project
      setSelectedProject(
        (currentProject) => ({
          ...currentProject,
          verification_status:
            reviewStatus,
          officer_note:
            officerNote,
        })
      );

      // Update project in officer table
      setProjects(
        (currentProjects) =>
          currentProjects.map(
            (project) =>
              project.work_id ===
              selectedProject.work_id
                ? {
                    ...project,
                    verification_status:
                      reviewStatus,
                  }
                : project
          )
      );

      setMessage(
        "Officer review status updated successfully."
      );
    } catch (error) {
      console.error(
        "Review save error:",
        error
      );

      setMessage(
        error.message ||
          "Could not save the officer review."
      );
    } finally {
      setReviewSaving(false);
    }
  }

  // =====================================================
  // DASHBOARD CALCULATIONS
  // =====================================================

  const recommendedCount = Number(
    summary?.recommended_projects || 0
  );

  const sanctionedCount = Number(
    summary?.sanctioned_projects || 0
  );

  const completedCount = Number(
    summary?.completed_projects || 0
  );

  const totalProjects = Number(
    summary?.total_projects || 0
  );

  const completionRate = Number(
    summary?.completion_rate || 0
  );

  const highestStageCount = Math.max(
    recommendedCount,
    sanctionedCount,
    completedCount,
    1
  );

  // =====================================================
  // ROLE GATEWAY
  // =====================================================

  if (selectedRole === null) {
    return (
      <RoleGateway
        onOfficerAccess={() =>
          setSelectedRole("officer")
        }
        onCitizenAccess={() =>
          setSelectedRole("citizen")
        }
      />
    );
  }

  // =====================================================
  // CITIZEN PORTAL
  // =====================================================

  if (selectedRole === "citizen") {
    return (
      <CitizenPortal
        onBack={() =>
          setSelectedRole(null)
        }
      />
    );
  }

  // =====================================================
  // OFFICER CONSOLE
  // =====================================================

  return (
    <div className="app-shell">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="top-header">

        <div>
          <p className="government-label">
            Government of Maharashtra
          </p>

          <h1>
            MPLADS Work Monitoring System
          </h1>
        </div>

        <div className="header-meta">
          <strong>
            Officer Console
          </strong>

          <span>
            Maharashtra Prototype Dataset
          </span>
        </div>

      </header>

      {/* =================================================
          NAVIGATION
      ================================================= */}

      <nav className="navigation">

        <button
          type="button"
          className="nav-link active-nav"
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior: "smooth",
            })
          }
        >
          Dashboard
        </button>

        <button
          type="button"
          className="nav-link"
          onClick={() =>
            document
              .querySelector(
                ".table-section"
              )
              ?.scrollIntoView({
                behavior: "smooth",
              })
          }
        >
          Projects
        </button>

        <button
          type="button"
          className="nav-link"
          onClick={() =>
            document
              .querySelector(
                "#add-project"
              )
              ?.scrollIntoView({
                behavior: "smooth",
              })
          }
        >
          Add Project
        </button>

        <button
          type="button"
          className="nav-link"
          onClick={() =>
            setSelectedRole("citizen")
          }
        >
          Citizen View
        </button>

        <button
          type="button"
          className="nav-link"
          onClick={() => {
            setSelectedRole(null);

            window.scrollTo({
              top: 0,
              behavior: "smooth",
            });
          }}
        >
          Change Access
        </button>

      </nav>

      {/* =================================================
          MAIN CONTENT
      ================================================= */}

      <main className="main-content">

        {/* =================================================
            PAGE HEADING
        ================================================= */}

        <section className="page-heading">

          <div>

            <p className="eyebrow">
              Maharashtra statewide overview
            </p>

            <h2>
              Project monitoring dashboard
            </h2>

            <p>
              Identify delayed works for
              human review using explainable
              risk indicators.
            </p>

          </div>

          <span className="data-date">
            Data duration reference:
            27 Aug 2026
          </span>

        </section>

        {/* =================================================
            MESSAGE
        ================================================= */}

        {message && (
          <div className="message-box">
            {message}
          </div>
        )}

        {/* =================================================
            RISK DISCLAIMER
        ================================================= */}

        <section className="notice-box">

          <strong>
            Important:
          </strong>{" "}

          Risk flags help officers
          prioritise review. They do not
          establish fraud, misconduct,
          or liability.

        </section>

        {/* =================================================
            PORTFOLIO LIFECYCLE
        ================================================= */}

        <section className="lifecycle-section">

          <div className="lifecycle-heading">

            <div>

              <p className="eyebrow">
                Portfolio lifecycle
              </p>

              <h2>
                From recommendation
                to completion
              </h2>

              <p>
                Recorded Maharashtra project
                lifecycle. This is not a physical
                construction-progress measurement.
              </p>

            </div>

            <div
              className="completion-donut"
              style={{
                "--completion-angle":
                  `${completionRate * 3.6}deg`,
              }}
            >

              <div>

                <strong>
                  {completionRate}%
                </strong>

                <span>
                  completed
                </span>

              </div>

            </div>

          </div>

          <div className="lifecycle-flow">

            {/* RECOMMENDED */}

            <div className="lifecycle-stage">

              <div className="stage-label">

                <span>
                  1. Recommended
                </span>

                <strong>
                  {recommendedCount}
                </strong>

              </div>

              <div className="stage-track">

                <div
                  className="stage-fill recommended-fill"
                  style={{
                    width:
                      `${(
                        recommendedCount /
                        highestStageCount
                      ) * 100}%`,
                  }}
                />

              </div>

            </div>

            <div className="flow-arrow">
              →
            </div>

            {/* SANCTIONED */}

            <div className="lifecycle-stage">

              <div className="stage-label">

                <span>
                  2. Sanctioned
                </span>

                <strong>
                  {sanctionedCount}
                </strong>

              </div>

              <div className="stage-track">

                <div
                  className="stage-fill sanctioned-fill"
                  style={{
                    width:
                      `${(
                        sanctionedCount /
                        highestStageCount
                      ) * 100}%`,
                  }}
                />

              </div>

            </div>

            <div className="flow-arrow">
              →
            </div>

            {/* COMPLETED */}

            <div className="lifecycle-stage">

              <div className="stage-label">

                <span>
                  3. Completed
                </span>

                <strong>
                  {completedCount}
                </strong>

              </div>

              <div className="stage-track">

                <div
                  className="stage-fill completed-fill"
                  style={{
                    width:
                      `${(
                        completedCount /
                        highestStageCount
                      ) * 100}%`,
                  }}
                />

              </div>

            </div>

          </div>

          <p className="lifecycle-note">

            {Math.max(
              totalProjects -
                completedCount,
              0
            )}{" "}
            projects remain under
            monitoring or require completion
            updates.

          </p>

        </section>

        {/* =================================================
            SUMMARY CARDS
        ================================================= */}

        <section className="summary-grid">

          <article className="summary-card">

            <span>
              Total Works
            </span>

            <strong>
              {summary?.total_projects ??
                "—"}
            </strong>

            <small>
              Maharashtra project records
            </small>

          </article>

          <article className="summary-card completed-card">

            <span>
              Completed
            </span>

            <strong>
              {summary?.completed_projects ??
                "—"}
            </strong>

            <small>
              Recorded as completed
            </small>

          </article>

          <article className="summary-card pending-card">

            <span>
              Pending
            </span>

            <strong>
              {summary?.pending_projects ??
                "—"}
            </strong>

            <small>
              Require progress monitoring
            </small>

          </article>

          <article className="summary-card critical-card">

            <span>
              Critical Risk
            </span>

            <strong>
              {summary?.critical_risk_projects ??
                "—"}
            </strong>

            <small>
              {summary?.pending_over_500_days ??
                "—"}{" "}
              pending over 500 days
            </small>

          </article>

        </section>

        {/* =================================================
            AI-ASSISTED PROJECT INTAKE
        ================================================= */}

        <AddProjectForm
          onProjectSaved={loadDashboard}
        />

        {/* =================================================
            PROJECT TABLE
        ================================================= */}

        <section className="table-section">

          <div className="section-title">

            <div>

              <h2>
                Projects requiring attention
              </h2>

              <p>
                {filteredProjects.length}{" "}
                project records shown
              </p>

            </div>

          </div>

          {/* =================================================
              FILTERS
          ================================================= */}

          <div className="filters">

            <input
              type="search"
              placeholder="Search Work ID, project, or constituency"
              value={filters.search}
              onChange={(event) =>
                setFilters({
                  ...filters,
                  search:
                    event.target.value,
                })
              }
            />

            <select
              value={filters.location}
              onChange={(event) =>
                setFilters({
                  ...filters,
                  location:
                    event.target.value,
                })
              }
            >

              <option value="">
                All constituencies
              </option>

              {locations.map(
                (location) => (
                  <option
                    key={location}
                    value={location}
                  >
                    {location}
                  </option>
                )
              )}

            </select>

            <select
              value={filters.category}
              onChange={(event) =>
                setFilters({
                  ...filters,
                  category:
                    event.target.value,
                })
              }
            >

              <option value="">
                All categories
              </option>

              {categories.map(
                (category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {category}
                  </option>
                )
              )}

            </select>

            <select
              value={filters.stage}
              onChange={(event) =>
                setFilters({
                  ...filters,
                  stage:
                    event.target.value,
                })
              }
            >

              <option value="">
                All stages
              </option>

              {stages.map(
                (stage) => (
                  <option
                    key={stage}
                    value={stage}
                  >
                    {stage}
                  </option>
                )
              )}

            </select>

            <select
              value={filters.riskLevel}
              onChange={(event) =>
                setFilters({
                  ...filters,
                  riskLevel:
                    event.target.value,
                })
              }
            >

              <option value="">
                All risk levels
              </option>

              <option value="Critical">
                Critical
              </option>

              <option value="High">
                High
              </option>

              <option value="Medium">
                Medium
              </option>

              <option value="Low">
                Low
              </option>

            </select>

          </div>

          {/* =================================================
              LOADING
          ================================================= */}

          {loading ? (

            <p className="loading-text">
              Loading Maharashtra
              project records…
            </p>

          ) : (

            <div className="table-wrap">

              <table>

                <thead>

                  <tr>

                    <th>
                      Work ID
                    </th>

                    <th>
                      Record Type
                    </th>

                    <th>
                      Location
                    </th>

                    <th>
                      Category
                    </th>

                    <th>
                      Current Stage
                    </th>

                    <th>
                      Risk
                    </th>

                    <th>
                      Review Status
                    </th>

                    <th>
                      Action
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {filteredProjects.length ===
                  0 ? (

                    <tr>

                      <td colSpan="8">

                        No project records
                        match the selected
                        filters.

                      </td>

                    </tr>

                  ) : (

                    filteredProjects.map(
                      (project) => (

                        <tr
                          key={
                            `${
                              project.record_type ||
                              "record"
                            }-${
                              project.work_id
                            }`
                          }
                        >

                          {/* WORK ID */}

                          <td className="work-id">
                            {project.work_id}
                          </td>

                          {/* RECORD TYPE */}

                          <td>

                            <span
                              className={
                                project.record_type ===
                                "New Prototype Submission"
                                  ? "record-badge new-record"
                                  : "record-badge historical-record"
                              }
                            >

                              {project.record_type ===
                              "New Prototype Submission"
                                ? "New Prototype Submission"
                                : "Historical Record"}

                            </span>

                          </td>

                          {/* LOCATION */}

                          <td>
                            {project.location ||
                              "Not recorded"}
                          </td>

                          {/* CATEGORY */}

                          <td>
                            {project.suggested_category ||
                              "Not categorised"}
                          </td>

                          {/* STAGE */}

                          <td>
                            {project.current_stage ||
                              "Not recorded"}
                          </td>

                          {/* RISK */}

                          <td>

                            <span
                              className={
                                `risk-tag ${riskClass(
                                  project.risk_level
                                )}`
                              }
                            >

                              {project.risk_level ||
                                "Low"}{" "}
                              —{" "}
                              {project.delay_risk_score ??
                                0}

                            </span>

                          </td>

                          {/* REVIEW STATUS */}

                          <td>
                            {project.verification_status ||
                              "Pending Review"}
                          </td>

                          {/* ACTION */}

                          <td>

                            <button
                              type="button"
                              className="view-button"
                              onClick={() =>
                                openProject(
                                  project.work_id
                                )
                              }
                            >
                              View details
                            </button>

                          </td>

                        </tr>

                      )
                    )

                  )}

                </tbody>

              </table>

            </div>

          )}

        </section>

      </main>

      {/* =================================================
          PROJECT DETAILS LOADING MODAL
      ================================================= */}

      {projectLoading && (

        <div className="modal-overlay">

          <section className="project-modal loading-modal">

            <p className="eyebrow">
              Project information
            </p>

            <h2>
              Loading project details
            </h2>

            <p>
              Please wait while the project
              record is retrieved.
            </p>

          </section>

        </div>

      )}

      {/* =================================================
          PROJECT DETAILS / HUMAN REVIEW MODAL
      ================================================= */}

      {selectedProject && (

        <div className="modal-overlay">

          <section className="project-modal">

            <button
              type="button"
              className="close-button"
              onClick={closeProjectModal}
              disabled={reviewSaving}
              aria-label="Close project details"
            >
              ×
            </button>

            <p className="eyebrow">

              {selectedProject.record_type ===
              "New Prototype Submission"
                ? "New prototype submission"
                : "Officer review record"}

            </p>

            <h2>
              Project details
            </h2>

            <p className="modal-work-id">
              {selectedProject.work_id}
            </p>

            {/* =================================================
                PROJECT DETAILS
            ================================================= */}

            <div className="detail-grid">

              <div>

                <span>
                  Record type
                </span>

                <strong>
                  {selectedProject.record_type ||
                    "Historical Maharashtra Record"}
                </strong>

              </div>

              <div>

                <span>
                  Constituency / Location
                </span>

                <strong>
                  {selectedProject.location ||
                    "Not recorded"}
                </strong>

              </div>

              <div>

                <span>
                  Category
                </span>

                <strong>
                  {selectedProject.suggested_category ||
                    "Not categorised"}
                </strong>

              </div>

              <div>

                <span>
                  Current stage
                </span>

                <strong>
                  {selectedProject.current_stage ||
                    "Not recorded"}
                </strong>

              </div>

              <div>

                <span>
                  Completion status
                </span>

                <strong>
                  {selectedProject.completion_status ||
                    selectedProject.public_status ||
                    "Not recorded"}
                </strong>

              </div>

              <div>

                <span>
                  Recommended
                </span>

                <strong>
                  {formatDate(
                    selectedProject.recommended_date
                  )}
                </strong>

              </div>

              <div>

                <span>
                  Sanctioned
                </span>

                <strong>
                  {formatDate(
                    selectedProject.sanctioned_date
                  )}
                </strong>

              </div>

            </div>

            {/* =================================================
                DESCRIPTION
            ================================================= */}

            <div className="description-box">

              <strong>
                Work description
              </strong>

              <p>
                {selectedProject.project_description ||
                  "No project description recorded."}
              </p>

            </div>

            {/* =================================================
                RISK EXPLANATION
            ================================================= */}

            <div className="reason-box">

              <span
                className={
                  `risk-tag ${riskClass(
                    selectedProject.risk_level
                  )}`
                }
              >

                {selectedProject.risk_level ||
                  "Low"}{" "}
                risk —{" "}
                {selectedProject.delay_risk_score ??
                  0}

              </span>

              <h3>
                Why does this require attention?
              </h3>

              <p>
                {selectedProject.risk_reasons ||
                  "This project requires officer validation based on its recorded status."}
              </p>

            </div>

            {/* =================================================
                HUMAN REVIEW
            ================================================= */}

            <div className="review-box">

              <h3>
                Officer decision
              </h3>

              <p className="review-guidance">
                Review the recorded project
                information and risk explanation
                before making an officer decision.
              </p>

              <select
                value={reviewStatus}
                onChange={(event) =>
                  setReviewStatus(
                    event.target.value
                  )
                }
                disabled={reviewSaving}
              >

                <option>
                  Pending Review
                </option>

                <option>
                  Verified
                </option>

                <option>
                  Clarification Requested
                </option>

                <option>
                  Escalated
                </option>

                <option>
                  False Positive
                </option>

              </select>

              <textarea
                rows="3"
                placeholder="Add an internal officer note (optional)"
                value={officerNote}
                onChange={(event) =>
                  setOfficerNote(
                    event.target.value
                  )
                }
                disabled={reviewSaving}
              />

              <button
                type="button"
                className="save-button"
                onClick={saveReview}
                disabled={reviewSaving}
              >

                {reviewSaving
                  ? "Saving..."
                  : "Save officer decision"}

              </button>

            </div>

          </section>

        </div>

      )}

    </div>
  );
}