const STAGES = [
  {
    title: 'Capture documents',
    description: 'Upload supplier invoices alongside the purchase orders they bill against.',
  },
  {
    title: 'Extract fields',
    description:
      'Read supplier details, dates, line items, quantities, unit prices and tax. Fields that cannot be read are marked missing, never guessed.',
  },
  {
    title: 'Reconcile',
    description:
      'Compare invoice lines with purchase order lines using deterministic, tested rules for quantity, price and tax variances.',
  },
  {
    title: 'Detect duplicates',
    description: 'Flag invoices that look like resubmissions of ones already received.',
  },
  {
    title: 'Human review',
    description:
      'Route uncertain or out-of-tolerance cases to a reviewer, with the supporting evidence for each finding.',
  },
];

export default function WorkflowOverview() {
  return (
    <section className="card" aria-labelledby="workflow-title">
      <div className="card-header">
        <h2 id="workflow-title">Reconciliation workflow</h2>
        <span className="tag">Planned</span>
      </div>
      <p className="card-note">These stages are on the roadmap and are not available in this build.</p>

      <ol className="workflow">
        {STAGES.map((stage, index) => (
          <li key={stage.title} className="workflow-step">
            <span className="step-number" aria-hidden="true">
              {index + 1}
            </span>
            <div>
              <h3>{stage.title}</h3>
              <p>{stage.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
