import "./RoleGateway.css";

export default function RoleGateway({
  onOfficerAccess,
  onCitizenAccess,
}) {
  return (
    <div className="gateway-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="gateway-header">

        <div>

          <p className="gateway-government">
            MPLADS Monitoring &amp;
            Transparency
          </p>

          <h1>
            MPLADS Work Monitoring System
          </h1>

        </div>

        <div className="gateway-header-meta">

          <strong>
            SIH 2026 Prototype
          </strong>

          <span>
            Maharashtra
          </span>

        </div>

      </header>

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="gateway-main">

        {/* =================================================
            INTRODUCTION
        ================================================= */}

        <section className="gateway-introduction">

          <p className="gateway-eyebrow">
            Maharashtra monitoring and
            transparency platform
          </p>

          <h2>
            Monitor public works.
            <br />
            Improve transparency.
          </h2>

          <p className="gateway-description">
            An explainable AI-assisted
            prototype for monitoring MPLADS
            works, supporting officer review,
            and providing citizens with public
            project information.
          </p>

        </section>

        {/* =================================================
            ROLE SELECTION
        ================================================= */}

        <section className="gateway-role-section">

          <div className="gateway-section-heading">

            <h3>
              Select access
            </h3>

            <p>
              Choose the interface appropriate
              to your role.
            </p>

          </div>

          <div className="gateway-cards">

            {/* =================================================
                OFFICER CARD
            ================================================= */}

            <button
              type="button"
              className="gateway-card"
              onClick={onOfficerAccess}
            >

              <div
                className="gateway-card-icon"
                aria-hidden="true"
              >
                O
              </div>

              <div className="gateway-card-content">

                <span className="gateway-card-label">
                  Officer Console
                </span>

                <h3>
                  Monitoring &amp;
                  Verification
                </h3>

                <p>
                  Review Maharashtra works,
                  examine explainable risk
                  alerts, use AI-assisted project
                  intake, and record officer
                  decisions.
                </p>

                <span className="gateway-card-action">
                  Enter Officer Console →
                </span>

              </div>

            </button>

            {/* =================================================
                CITIZEN CARD
            ================================================= */}

            <button
              type="button"
              className="gateway-card"
              onClick={onCitizenAccess}
            >

              <div
                className="gateway-card-icon"
                aria-hidden="true"
              >
                C
              </div>

              <div className="gateway-card-content">

                <span className="gateway-card-label">
                  Citizen Portal
                </span>

                <h3>
                  Public Project
                  Transparency
                </h3>

                <p>
                  Search and filter publicly
                  available Maharashtra MPLADS
                  project information and view
                  current project status.
                </p>

                <span className="gateway-card-action">
                  Enter Citizen Portal →
                </span>

              </div>

            </button>

          </div>

        </section>

        {/* =================================================
            NOTICE
        ================================================= */}

        <section className="gateway-notice">

          <strong>
            Prototype environment
          </strong>

          <p>
            This demonstration uses simulated
            role access. Production deployment
            would use authorised government
            authentication for officer access.
          </p>

        </section>

      </main>

      {/* =================================================
          FOOTER
      ================================================= */}

      <footer className="gateway-footer">

        <span>
          Maharashtra MPLADS Monitoring
          Prototype
        </span>

        <span>
          SIH 2026
        </span>

      </footer>

    </div>
  );
}