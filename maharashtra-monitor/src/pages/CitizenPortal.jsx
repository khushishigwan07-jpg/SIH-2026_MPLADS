import {
  useEffect,
  useMemo,
  useState,
} from "react";

const API = "https://maharashtra-monitor-api.onrender.com";

export default function CitizenPortal({ onBack }) {
  const [projects, setProjects] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  const [filters, setFilters] = useState({
    search: "",
    location: "",
    category: "",
    status: "",
  });

  // =====================================================
  // LOAD PUBLIC PROJECTS
  // =====================================================

  useEffect(() => {
    async function loadCitizenProjects() {
      try {
        setLoading(true);
        setMessage("");

        const response = await fetch(
          `${API}/api//citizen/projects`
        );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Could not load public project information."
          );
        }

        setProjects(
          Array.isArray(data)
            ? data
            : []
        );

      } catch (error) {
        console.error(
          "Citizen portal error:",
          error
        );

        setMessage(
          error.message ||
            "Unable to load public project information."
        );

        setProjects([]);

      } finally {
        setLoading(false);
      }
    }

    void loadCitizenProjects();
  }, []);

  // =====================================================
  // LOCATION FILTER OPTIONS
  // =====================================================

  const locations = useMemo(() => {
    return [
      ...new Set(
        projects
          .map(
            (project) =>
              project.location
          )
          .filter(Boolean)
      ),
    ].sort();
  }, [projects]);

  // =====================================================
  // CATEGORY FILTER OPTIONS
  // =====================================================

  const categories = useMemo(() => {
    return [
      ...new Set(
        projects
          .map(
            (project) =>
              project.category
          )
          .filter(Boolean)
      ),
    ].sort();
  }, [projects]);

  // =====================================================
  // STATUS FILTER OPTIONS
  // =====================================================

  const statuses = useMemo(() => {
    return [
      ...new Set(
        projects
          .map(
            (project) =>
              project.public_status
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

    return projects.filter(
      (project) => {
        const workId =
          String(
            project.work_id || ""
          ).toLowerCase();

        const title =
          String(
            project.project_title || ""
          ).toLowerCase();

        const location =
          String(
            project.location || ""
          ).toLowerCase();

        const matchesSearch =
          !searchText ||
          workId.includes(
            searchText
          ) ||
          title.includes(
            searchText
          ) ||
          location.includes(
            searchText
          );

        const matchesLocation =
          !filters.location ||
          project.location ===
            filters.location;

        const matchesCategory =
          !filters.category ||
          project.category ===
            filters.category;

        const matchesStatus =
          !filters.status ||
          project.public_status ===
            filters.status;

        return (
          matchesSearch &&
          matchesLocation &&
          matchesCategory &&
          matchesStatus
        );
      }
    );
  }, [projects, filters]);

  // =====================================================
  // UPDATE FILTER
  // =====================================================

  function updateFilter(
    name,
    value
  ) {
    setFilters(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );
  }

  // =====================================================
  // CLEAR FILTERS
  // =====================================================

  function clearFilters() {
    setFilters({
      search: "",
      location: "",
      category: "",
      status: "",
    });
  }

  // =====================================================
  // REFRESH PUBLIC DATA
  // =====================================================

  async function refreshProjects() {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(
        `${API}/api/citizen/projects`
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Could not refresh public project information."
        );
      }

      setProjects(
        Array.isArray(data)
          ? data
          : []
      );

    } catch (error) {
      console.error(error);

      setMessage(
        error.message ||
          "Unable to refresh public project information."
      );

    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell citizen-portal">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="top-header">

        <div>
          <p className="government-label">
            MPLADS Public Information
          </p>

          <h1>
            Public Project Transparency Portal
          </h1>
        </div>

        <div className="header-meta">
          <strong>
            Citizen View
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
          className="back-navigation"
          onClick={onBack}
        >
          ← Back to access selection
        </button>

        <span className="active-nav">
          Citizen Portal
        </span>

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
              Public transparency layer
            </p>

            <h2>
              Maharashtra MPLADS project information
            </h2>

            <p>
              Search and filter publicly available
              information about Maharashtra public works.
            </p>

          </div>

        </section>

        {/* =================================================
            PUBLIC INFORMATION NOTICE
        ================================================= */}

        <section className="notice-box citizen-notice">

          <strong>
            Public information:
          </strong>{" "}

          This portal displays project information
          intended for public transparency. Internal
          risk analysis, officer notes, and verification
          decisions are not displayed here.

        </section>

        {/* =================================================
            PROJECT TABLE SECTION
        ================================================= */}

        <section
          className="table-section citizen-project-section"
        >

          {/* SECTION TITLE */}

          <div className="section-title">

            <div>

              <h2>
                Public project records
              </h2>

              <p>
                {filteredProjects.length}{" "}
                project{" "}
                {filteredProjects.length === 1
                  ? "record"
                  : "records"}{" "}
                shown
              </p>

            </div>

            <button
              type="button"
              className="clear-filter-button"
              onClick={refreshProjects}
              disabled={loading}
            >
              {loading
                ? "Refreshing..."
                : "Refresh data"}
            </button>

          </div>

          {/* =================================================
              FILTERS
          ================================================= */}

          <div className="filters citizen-filters">

            {/* SEARCH */}

            <input
              type="search"
              placeholder="Search Work ID, project, or location"
              value={filters.search}
              onChange={(event) =>
                updateFilter(
                  "search",
                  event.target.value
                )
              }
            />

            {/* LOCATION */}

            <select
              value={filters.location}
              onChange={(event) =>
                updateFilter(
                  "location",
                  event.target.value
                )
              }
            >

              <option value="">
                All locations
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

            {/* CATEGORY */}

            <select
              value={filters.category}
              onChange={(event) =>
                updateFilter(
                  "category",
                  event.target.value
                )
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

            {/* STATUS */}

            <select
              value={filters.status}
              onChange={(event) =>
                updateFilter(
                  "status",
                  event.target.value
                )
              }
            >

              <option value="">
                All completion statuses
              </option>

              {statuses.map(
                (status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {status}
                  </option>
                )
              )}

            </select>

            {/* CLEAR */}

            <button
              type="button"
              className="clear-filter-button"
              onClick={clearFilters}
            >
              Clear filters
            </button>

          </div>

          {/* =================================================
              ERROR / MESSAGE
          ================================================= */}

          {message && (
            <div className="message-box">
              {message}
            </div>
          )}

          {/* =================================================
              LOADING
          ================================================= */}

          {loading ? (
            <p className="loading-text">
              Loading public project records…
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
                      Project
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
                      Public Status
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {filteredProjects.length === 0 ? (

                    <tr>

                      <td
                        colSpan="6"
                        className="empty-table-message"
                      >
                        No public project records
                        match the selected filters.
                      </td>

                    </tr>

                  ) : (

                    filteredProjects.map(
                      (project, index) => (

                        <tr
                          key={`${project.record_type || "project"}-${project.work_id}-${index}`}
                        >

                          {/* WORK ID */}

                          <td className="work-id">

                            <span>
                              {project.work_id}
                            </span>

                          </td>

                          {/* PROJECT */}

                          <td className="project-description-cell">

                            {project.project_title ||
                              "MPLADS Public Work"}

                          </td>

                          {/* LOCATION */}

                          <td className="location-cell">

                            {project.location ||
                              "Not recorded"}

                          </td>

                          {/* CATEGORY */}

                          <td className="category-cell">

                            {project.category ||
                              "Other Public Works"}

                          </td>

                          {/* CURRENT STAGE */}

                          <td className="stage-cell">

                            {project.current_stage ||
                              "Not recorded"}

                          </td>

                          {/* PUBLIC STATUS */}

                          <td className="status-cell">

                            <span className="public-status">

                              {project.public_status ||
                                "Status not recorded"}

                            </span>

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

        {/* =================================================
            FOOTER INFORMATION
        ================================================= */}

        <section className="citizen-footer-note">

          <h3>
            About this portal
          </h3>

          <p>
            The Citizen Portal is a transparency layer
            that provides access to publicly available
            project information. Internal monitoring and
            officer verification information remains
            restricted to the officer interface.
          </p>

        </section>

      </main>

    </div>
  );
}