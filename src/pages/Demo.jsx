import React, { useState, useRef } from 'react';
import '../Demo.css';

export default function Demo() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);
  const resultsRef = useRef(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResults([]);
    setSearched(true);

    try {
      const response = await fetch('https://gtm360-ai-proxy.sameerjoshy.workers.dev/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, num: 6 }),
      });

      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      setResults(data.results || []);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="demo-container">
      <div className="demo-hero">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge-icon">✨</span>
            AI-Powered Research
          </div>
          <h1 className="hero-title">Real-time web search powered by your agents</h1>
          <p className="hero-subtitle">Watch GTM360 agents gather prospect intelligence in seconds. This is the research layer that fuels smarter sales.</p>
        </div>

        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-wrapper">
            <div className="search-icon">🔍</div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search: AI vendors in enterprise SaaS, Python frameworks, VP Sales at Stripe..."
              className="search-input"
              disabled={loading}
            />
            <button type="submit" disabled={loading || !query.trim()} className="search-button">
              {loading ? 'Searching...' : 'Search →'}
            </button>
          </div>
          {!searched && <p className="search-hint">Try: machine learning enterprise adoption 2026</p>}
        </form>
      </div>

      {searched && (
        <div ref={resultsRef} className="results-section">
          {error && <div className="error-card"><span className="error-icon">⚠️</span><div><p className="error-title">Search failed</p><p className="error-message">{error}</p></div></div>}

          {loading && (
            <div className="loading-skeleton">
              {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="skeleton-card"><div className="skeleton-title"></div><div className="skeleton-snippet"></div></div>)}
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="results-grid">
              <div className="results-header"><h2>Results</h2><span className="result-count">{results.length} found</span></div>
              <div className="results-list">
                {results.map((result, idx) => (
                  <a key={idx} href={result.link} target="_blank" rel="noopener noreferrer" className="result-card">
                    <div className="result-header">
                      <h3 className="result-title">{result.title}</h3>
                      <span className="result-index">{idx + 1}</span>
                    </div>
                    <p className="result-snippet">{result.snippet}</p>
                    <div className="result-footer">
                      <span className="result-link">{new URL(result.link).hostname}</span>
                      <span className="external-icon">↗</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {!loading && searched && results.length === 0 && !error && <div className="empty-state"><span className="empty-icon">📭</span><p>No results found. Try a different search.</p></div>}
        </div>
      )}

      <div className="demo-footer"><p>This demo showcases GTM360s AI proxy calling Serper for real-time web search.</p><a href="/" className="footer-link">Back to GTM360 HQ</a></div>
    </div>
  );
}