def test_orchestrator_initialization():
    from agents.orchestrator import AgentOrchestrator
    config = {"agents_enabled": ["lead_qual"]}
    orchestrator = AgentOrchestrator(config)
    assert orchestrator is not None
