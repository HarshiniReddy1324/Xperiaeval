import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Card } from '../components/ui';

export function NotFound() {
  return (
    <div className="authPage">
      <Card className="authCard">
        <h1>Page not found</h1>
        <p className="muted">This URL does not match any route in the portal.</p>
        <Link to="/dashboard">
          <Button>Go to dashboard</Button>
        </Link>
      </Card>
    </div>
  );
}
