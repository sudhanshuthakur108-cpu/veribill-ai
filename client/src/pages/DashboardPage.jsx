import { Link, useOutletContext } from 'react-router';
import SystemStatusPanel from '../components/SystemStatusPanel.jsx';
import WorkflowOverview from '../components/WorkflowOverview.jsx';

const PRINCIPLES = [
  {
    title: 'Deterministic calculations',
    description: 'Totals, variances and tolerances come from tested code, not from a language model.',
  },
  {
    title: 'No invented values',
    description: 'Missing or unreadable data stays empty and is flagged for review.',
  },
  {
    title: 'People make the call',
    description: 'Uncertain matches go to a reviewer. Nothing is approved without supporting evidence.',
  },
];

export default function DashboardPage() {
  const apiHealth = useOutletContext();

  return (
    <>
      <section className="intro">
        <p className="eyebrow">Invoice reconciliation</p>
        <h1>Match supplier invoices to purchase orders, with evidence for every finding.</h1>
        <p className="lead">
          VeriBill AI will extract invoice data, compare it line by line with purchase orders, flag likely
          duplicates and send uncertain cases to a reviewer. Today you can record purchase orders and supplier
          invoices; document upload, extraction and matching are not available yet.
        </p>
        <div className="intro-actions">
          <Link className="button button-primary" to="/purchase-orders">
            Purchase orders
          </Link>
          <Link className="button button-quiet" to="/invoices">
            Invoices
          </Link>
        </div>
      </section>

      <div className="dashboard-grid">
        <WorkflowOverview />

        <div className="side-column">
          <SystemStatusPanel {...apiHealth} />

          <section className="card" aria-labelledby="principles-title">
            <h2 id="principles-title">Design principles</h2>
            <ul className="principles">
              {PRINCIPLES.map((principle) => (
                <li key={principle.title}>
                  <h3>{principle.title}</h3>
                  <p>{principle.description}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
