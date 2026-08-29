import { useState } from "react";

const API = "https://maharashtra-monitor-api.onrender.com";

const categories = [
  "Roads & Infrastructure",
  "Water & Sanitation",
  "Education",
  "Health",
  "Community Facilities",
  "Environment & Plantation",
  "Sports & Recreation",
  "Transport Facilities",
  "Railway-related Community Works",
  "Other Public Works",
];

const initialFormData = {
  workId: "",
  projectDescription: "",
  location: "",
  implementingAgency: "",
  recommendedDate: "",
  sanctionedDate: "",
  recommendedAmount: "",
  sanctionedAmount: "",
  currentStage: "Recommended",
};

export default function AddProjectForm({
  onProjectSaved,
}) {
  const [formData, setFormData] =
    useState(initialFormData);

  const [analysis, setAnalysis] =
    useState(null);

  const [confirmedCategory, setConfirmedCategory] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [submittedProject, setSubmittedProject] =
    useState(null);

  const [analysing, setAnalysing] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  // =====================================================
  // UPDATE FORM FIELD
  // =====================================================

  function updateField(event) {
    const { name, value } =
      event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    // Description changes require fresh AI analysis.
    if (name === "projectDescription") {
      setAnalysis(null);
      setConfirmedCategory("");
    }
  }

  // =====================================================
  // AI CATEGORY ANALYSIS
  // =====================================================

  async function analyseCategory() {
    setMessage("");
    setSubmittedProject(null);

    const description =
      formData.projectDescription.trim();

    if (!description) {
      setMessage(
        "Enter a project description before requesting analysis."
      );
      return;
    }

    setAnalysing(true);

    try {
      const response = await fetch(
        `${API}/ai/categorise`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            projectDescription:
              description,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Could not analyse the project description."
        );
      }

      setAnalysis(data);

      setConfirmedCategory(
        data.category || ""
      );
    } catch (error) {
      console.error(
        "Category analysis error:",
        error
      );

      setMessage(
        error.message ||
          "Could not analyse the project description."
      );
    } finally {
      setAnalysing(false);
    }
  }

  // =====================================================
  // SUBMIT PROJECT
  // =====================================================

  async function submitProject(event) {
    event.preventDefault();

    setMessage("");
    setSubmittedProject(null);

    if (!formData.workId.trim()) {
      setMessage(
        "Please enter a Work ID."
      );
      return;
    }

    if (
      !formData.projectDescription.trim()
    ) {
      setMessage(
        "Please enter a project description."
      );
      return;
    }

    if (!formData.location.trim()) {
      setMessage(
        "Please enter the project location."
      );
      return;
    }

    if (!analysis) {
      setMessage(
        "Please analyse the project description before saving."
      );
      return;
    }

    if (!confirmedCategory) {
      setMessage(
        "Please confirm a project category before saving."
      );
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `${API}/project-submissions`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            ...formData,
            confirmedCategory,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Could not save the new project."
        );
      }

      setSubmittedProject(
        data.project
      );

      setMessage(
        "Project stored successfully for officer review."
      );

      // Refresh dashboard data immediately.
      if (onProjectSaved) {
        await onProjectSaved();
      }

      // Reset form after successful submission.
      setFormData({
        ...initialFormData,
      });

      setAnalysis(null);
      setConfirmedCategory("");
    } catch (error) {
      console.error(
        "Project submission error:",
        error
      );

      setMessage(
        error.message ||
          "Could not save the new project."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className="add-project-section"
      id="add-project"
    >

      {/* =================================================
          SECTION HEADER
      ================================================= */}

      <div className="section-title">

        <div>

          <p className="eyebrow">
            AI-assisted intake
          </p>

          <h2>
            Add a new project
          </h2>

          <p>
            The system suggests a category
            from the project description.
            The officer must review and
            confirm it before saving.
          </p>

        </div>

      </div>

      {/* =================================================
          MESSAGE
      ================================================= */}

      {message && (
        <div className="message-box">
          {message}
        </div>
      )}

      {/* =================================================
          PROJECT FORM
      ================================================= */}

      <form
        className="project-form"
        onSubmit={submitProject}
      >

        <div className="form-grid">

          {/* WORK ID */}

          <label>
            Work ID *

            <input
              name="workId"
              value={formData.workId}
              onChange={updateField}
              placeholder="DEMO/MH/2026/001"
              required
              disabled={saving || analysing}
            />
          </label>

          {/* LOCATION */}

          <label>
            City / Area / Constituency *

            <input
              name="location"
              value={formData.location}
              onChange={updateField}
              placeholder="Mumbai North"
              required
              disabled={saving || analysing}
            />
          </label>

          {/* IMPLEMENTING AGENCY */}

          <label>
            Implementing Agency

            <input
              name="implementingAgency"
              value={
                formData.implementingAgency
              }
              onChange={updateField}
              placeholder="Municipal authority / IDA"
              disabled={saving || analysing}
            />
          </label>

          {/* CURRENT STAGE */}

          <label>
            Current Stage

            <select
              name="currentStage"
              value={
                formData.currentStage
              }
              onChange={updateField}
              disabled={saving || analysing}
            >

              <option>
                Recommended
              </option>

              <option>
                Sanctioned
              </option>

              <option>
                Vendor Identification
              </option>

              <option>
                Physical Inspection
              </option>

              <option>
                Work partially Completed
              </option>

              <option>
                Completed
              </option>

            </select>
          </label>

          {/* RECOMMENDED DATE */}

          <label>
            Recommended Date

            <input
              type="date"
              name="recommendedDate"
              value={
                formData.recommendedDate
              }
              onChange={updateField}
              disabled={saving || analysing}
            />
          </label>

          {/* SANCTIONED DATE */}

          <label>
            Sanctioned Date

            <input
              type="date"
              name="sanctionedDate"
              value={
                formData.sanctionedDate
              }
              onChange={updateField}
              disabled={saving || analysing}
            />
          </label>

          {/* RECOMMENDED AMOUNT */}

          <label>
            Recommended Amount (₹)

            <input
              type="number"
              name="recommendedAmount"
              value={
                formData.recommendedAmount
              }
              onChange={updateField}
              placeholder="1500000"
              min="0"
              disabled={saving || analysing}
            />
          </label>

          {/* SANCTIONED AMOUNT */}

          <label>
            Sanctioned Amount (₹)

            <input
              type="number"
              name="sanctionedAmount"
              value={
                formData.sanctionedAmount
              }
              onChange={updateField}
              placeholder="1500000"
              min="0"
              disabled={saving || analysing}
            />
          </label>

        </div>

        {/* =================================================
            PROJECT DESCRIPTION
        ================================================= */}

        <label className="description-input">

          Project Description *

          <textarea
            name="projectDescription"
            rows="4"
            value={
              formData.projectDescription
            }
            onChange={updateField}
            placeholder="Example: Construction of a drinking-water pipeline and storage tank for a village."
            required
            disabled={saving || analysing}
          />

        </label>

        {/* =================================================
            AI ANALYSIS BUTTON
        ================================================= */}

        <button
          type="button"
          className="analyse-button"
          onClick={analyseCategory}
          disabled={
            analysing || saving
          }
        >

          {analysing
            ? "Analysing..."
            : "Analyse and suggest category"}

        </button>

        {/* =================================================
            AI RESULT
        ================================================= */}

        {analysis && (

          <div className="ai-result-box">

            <p className="eyebrow">
              System suggestion
            </p>

            <h3>
              {analysis.category}
            </h3>

            <p>

              <strong>
                Confidence:
              </strong>{" "}

              {analysis.confidence}%

            </p>

            <p>

              <strong>
                Reason:
              </strong>{" "}

              {analysis.reason}

            </p>

            {/* OFFICER CONFIRMATION */}

            <label>

              Officer-confirmed category

              <select
                value={
                  confirmedCategory
                }
                onChange={(event) =>
                  setConfirmedCategory(
                    event.target.value
                  )
                }
                disabled={saving}
              >

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

            </label>

          </div>

        )}

        {/* =================================================
            SAVE BUTTON
        ================================================= */}

        <button
          type="submit"
          className="save-button"
          disabled={
            saving || analysing
          }
        >

          {saving
            ? "Saving project..."
            : "Confirm and save project"}

        </button>

      </form>

      {/* =================================================
          SUBMISSION RESULT
      ================================================= */}

      {submittedProject && (

        <div className="submission-result">

          <h3>
            Project saved successfully
          </h3>

          <p>

            <strong>
              Work ID:
            </strong>{" "}

            {submittedProject.work_id}

          </p>

          <p>

            <strong>
              Category:
            </strong>{" "}

            {submittedProject.suggested_category ||
              submittedProject.confirmed_category ||
              confirmedCategory}

          </p>

          <p>

            <strong>
              Initial risk:
            </strong>{" "}

            {submittedProject.risk_level ||
              "Low"}{" "}

            —{" "}

            {submittedProject.risk_score ??
              submittedProject.delay_risk_score ??
              0}

          </p>

          <p>

            <strong>
              Risk explanation:
            </strong>{" "}

            {submittedProject.risk_reasons ||
              "Project stored for officer review."}

          </p>

        </div>

      )}

    </section>
  );
}