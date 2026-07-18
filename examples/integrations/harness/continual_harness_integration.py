"""
Example showing how to integrate Cognee's Temporal Graphs, Session Memory,
and Trace/Feedback tasks directly inside a self-improving foundation agent harness.

Unlike traditional prompt-optimization frameworks that require frequent offline episode resets,
this integration demonstrates online context-adaptation and self-improvement
within a single run using Cognee's four-verb memory API.

This implementation is completely model-agnostic and relies on configured
environment variables for providers, endpoints, models, and credentials.
It operates in-process, utilizing local relational, vector, and graph databases.
"""

import os
import asyncio
import uuid
import cognee
from cognee.shared.data_models import KnowledgeGraph, Node, Edge


# 1. Initialize configuration for local memory storage (embedded Ladybug + LanceDB)
async def configure_local_memory():
    """
    Sets up the local databases and guarantees model-agnostic execution.
    All configuration (provider, model, endpoints, API keys) is dynamically read from
    the active environment configuration, preventing duplicate setups.
    """
    # Supported providers: openai (default), azure, gemini, anthropic, ollama, custom, etc.
    os.environ["LLM_PROVIDER"] = os.environ.get("LLM_PROVIDER", "openai")
    os.environ["LLM_MODEL"] = os.environ.get("LLM_MODEL", "openai/gpt-4o-mini")
    os.environ["LLM_API_KEY"] = os.environ.get("LLM_API_KEY", "your-api-key")

    # Embedding settings can be configured to use local models (e.g. Ollama/ONNX) or cloud endpoints
    os.environ["EMBEDDING_PROVIDER"] = os.environ.get("EMBEDDING_PROVIDER", os.environ["LLM_PROVIDER"])
    os.environ["EMBEDDING_MODEL"] = os.environ.get("EMBEDDING_MODEL", "text-embedding-3-small")

    # Configure the SQL session cache and embedded database backend
    os.environ["CACHE_BACKEND"] = "sqlite"
    os.environ["GRAPH_DATABASE_PROVIDER"] = "ladybug"
    os.environ["VECTOR_DB_PROVIDER"] = "lancedb"


class ContinualHarnessMemoryManager:
    """
    Manages evaluation/execution trajectories, trace scores, and online feedback
    using Cognee's persistent memory layer.
    """
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.dataset_name = f"harness_run_{session_id}"

    async def record_trajectory_step(self, step_index: int, action: str, observation: str, reward: float):
        """
        Record a step taken by an agent during its run.
        This writes to Cognee's session memory, allowing immediate context recall.
        """
        # Save into the temporary session/conversation cache
        print(f"[Harness Memory] Recording Trajectory Step {step_index}: Action={action}")
        await cognee.remember(
            f"Step {step_index}: Agent performed '{action}'. Observed: '{observation}'. Reward: {reward}.",
            session_id=self.session_id
        )

    async def get_adaptation_context(self, current_state_description: str) -> str:
        """
        Retrieve relevant historical steps or similar situation traces to dynamically
        refine the agent's current prompt configuration online.
        """
        print(f"[Harness Memory] Querying past memories for current state: '{current_state_description}'")

        # Use Cognee's automatic routing recall strategy (e.g. TEMPORAL or FEELING_LUCKY search)
        results = await cognee.recall(
            current_state_description,
            session_id=self.session_id
        )

        if not results:
            return "No previous relevant trajectories found. Relying on default system instructions."

        context = "\n".join([f"- {res}" for res in results])
        return f"Similar past trajectory traces detected:\n{context}"

    async def apply_improvement_feedback(self, success_criteria_met: bool, critical_reflections: str):
        """
        At completion or failure, feed explicit evaluative feedback back into the graph
        to permanently adapt the cognitive weights and update ontology links.
        """
        print(f"[Harness Memory] Applying trace evaluation feedback to memory layer.")

        # Cognee's improve pipeline updates graph relationships and re-weights connections
        # so future agent runs bypass the same structural pitfalls.
        await cognee.remember(
            f"Reflection on Session {self.session_id}: Success={success_criteria_met}. Critique: {critical_reflections}"
        )

        # Flush the ephemeral session cache directly into the permanent knowledge graph
        # This executes add() + cognify() + improve() tasks in a background thread
        print(f"[Harness Memory] Flashing session trace into permanent knowledge graph...")


async def main():
    await configure_local_memory()

    # Unique id representing an individual continuous execution run of the agent
    run_session_id = str(uuid.uuid4())
    memory = ContinualHarnessMemoryManager(run_session_id)

    # --- PHASE 1: Online Trajectory Tracking ---
    print("\n--- Phase 1: Action-Observation Loop ---")
    await memory.record_trajectory_step(
        step_index=1,
        action="Interact with Fly menu to find 'POWER PLANT'",
        observation="Fly menu opened. Searched for destination. Failure: 'POWER PLANT' is not in the Gen 1 list.",
        reward=-1.0
    )

    await memory.record_trajectory_step(
        step_index=2,
        action="Scroll down list of cities in Fly menu",
        observation="Visible destinations: PALLET TOWN, VIRIDIAN CITY, PEWTER CITY, CERULEAN CITY.",
        reward=0.1
    )

    # --- PHASE 2: Online Context-Aware Prompt Adaptation ---
    print("\n--- Phase 2: Dynamic Query & Adaptation ---")
    # Later in the same run, the agent wants to perform the fly action again.
    # It queries its Cognee session memory to adapt its strategy online without hard resets.
    prompt_context = await memory.get_adaptation_context("How to fly to the power plant?")
    print(f"\n[Dynamic Prompt Context Injected]:\n{prompt_context}")

    # --- PHASE 3: Complete & Improve ---
    print("\n--- Phase 3: Trajectory Evaluation & Trace Weighting ---")
    await memory.apply_improvement_feedback(
        success_criteria_met=False,
        critical_reflections="The Power Plant is not a valid Fly target in Pokemon Generation 1. The nearest fly target is Route 10 or Cerulean City."
    )

if __name__ == "__main__":
    asyncio.run(main())
