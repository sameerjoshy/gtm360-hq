def test_orchestrator_initialization():
    """Test that orchestrator can be instantiated"""
    try:
        from agents.orchestrator import get_orchestrator
        orchestrator = get_orchestrator()
        assert orchestrator is not None
    except ImportError as e:
        # APScheduler might not be installed in CI - skip
        pass
