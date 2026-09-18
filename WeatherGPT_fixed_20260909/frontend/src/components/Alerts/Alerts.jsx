import React from "react";

export default function Alerts({ data }) {
  return (
    <section className="panel">
      <h2>Alerts & Risk</h2>
      {!data ? <p>Loading...</p> : (
        <>
          <div className={`risk risk-${data.overall_severity}`}>
            Overall: {data.overall_severity} ({data.risk_score}/100)
          </div>
          {data.alerts.length === 0 ? (
            <p>No prototype risk alerts detected.</p>
          ) : (
            <div className="alert-list">
              {data.alerts.map((a, i) => (
                <div className={`alert ${a.severity}`} key={i}>
                  <strong>{a.title}</strong>
                  <span>{a.message}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
