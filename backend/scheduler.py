from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
from backend.agents.orchestrator import get_orchestrator

scheduler = BackgroundScheduler()

def schedule_agent(agent_name: str, trigger):
    """Schedule an agent with a cron trigger"""
    def run_job():
        try:
            print(f"[SCHEDULED] Running {agent_name}")
            orchestrator = get_orchestrator()
            result = orchestrator.run_agent(agent_name)
            if result.get("status") == "success":
                print(f"[SCHEDULED] {agent_name} completed: {result.get('items_processed', 0)} items")
            else:
                print(f"[SCHEDULED] {agent_name} failed: {result.get('error', 'unknown')}")
        except Exception as e:
            print(f"[SCHEDULED] {agent_name} error: {e}")
    
    scheduler.add_job(
        run_job,
        trigger=trigger,
        id=f"job_{agent_name.replace(' ', '_')}",
        name=f"Run {agent_name}",
        replace_existing=True
    )

def init_scheduler():
    """Initialize all scheduled jobs"""
    schedule_agent("lead_qualification", CronTrigger(minute=0))
    schedule_agent("deal_risk", CronTrigger(hour=8, minute=0))
    schedule_agent("competitive_intel", CronTrigger(hour=9, minute=0))
    schedule_agent("deal_review", CronTrigger(hour=10, minute=0))
    schedule_agent("early_health", CronTrigger(hour=7, minute=0))
    schedule_agent("support_triage", CronTrigger(minute="*/15"))
    schedule_agent("churn_risk", CronTrigger(hour=6, minute=0))
    schedule_agent("ebr_prep", CronTrigger(day_of_week=0, hour=8, minute=0))
    schedule_agent("stakeholder_coverage", CronTrigger(day_of_week=0, hour=9, minute=0))
    schedule_agent("upsell_signal", CronTrigger(hour=11, minute=0))
    schedule_agent("renewal", CronTrigger(hour=12, minute=0))
    schedule_agent("advocacy", CronTrigger(day_of_week=4, hour=10, minute=0))
    print("Scheduler initialized with 12 jobs")

def start_scheduler():
    """Start the background scheduler"""
    if not scheduler.running:
        init_scheduler()
        scheduler.start()
        print("Background scheduler started")

def stop_scheduler():
    """Stop the background scheduler"""
    if scheduler.running:
        scheduler.shutdown()
        print("Background scheduler stopped")

def get_scheduler_status() -> dict:
    """Get scheduler status and job list"""
    jobs = []
    for job in scheduler.get_jobs():
        jobs.append({
            "id": job.id,
            "name": job.name,
            "trigger": str(job.trigger),
            "next_run": job.next_run_time.isoformat() if job.next_run_time else None
        })
    return {"running": scheduler.running, "job_count": len(jobs), "jobs": jobs}
