import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-bg-base flex items-center justify-center p-8">
          <div className="max-w-lg w-full">
            <div className="text-danger font-mono text-xs uppercase tracking-widest mb-2">Render Error</div>
            <div className="text-text-pri font-mono text-sm mb-4">{this.state.error.message}</div>
            <pre className="bg-bg-s1 border border-bdr rounded-lg p-4 text-xxs font-mono text-text-sec overflow-auto max-h-64">
              {this.state.error.stack}
            </pre>
            <button
              onClick={() => this.setState({ error: null })}
              className="mt-4 btn-primary text-xs"
            >
              Retry
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
