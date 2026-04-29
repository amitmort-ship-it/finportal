import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">שגיאה בטעינה</h1>
            <p className="text-muted-foreground mb-4">{this.state.error?.message || 'אירעה שגיאה לא צפויה'}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
            >
              טען מחדש
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}