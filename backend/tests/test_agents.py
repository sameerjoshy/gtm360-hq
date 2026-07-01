def test_orchestrator_initialization():
    from backend.agents.orchestrator import get_orchestrator
    orchestrator = get_orchestrator()
    assert orchestrator is not None
    assert len(orchestrator.agents) == 14
