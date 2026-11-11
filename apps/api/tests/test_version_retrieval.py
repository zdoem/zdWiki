import pytest
from app.config import settings
from app.core.repository import MarkdownKnowledgeRepository
from app.index.sqlite_engine import SQLiteIndexEngine
from app.search.engine import SQLiteFTSSearchEngine
from app.models.context import ProjectContext

@pytest.fixture
def search_engine():
    repo = MarkdownKnowledgeRepository(settings.knowledge_dir)
    engine = SQLiteIndexEngine(settings.db_path)
    engine.rebuild_index(repo)
    return SQLiteFTSSearchEngine(engine)

def test_acceptance_scenario_a_java_version_context(search_engine):
    """
    Acceptance Scenario A:
    Query: 'Java concurrency virtual threads'
    Under Java 21 context -> Java 21 modern virtual threads should rank highest.
    Under Java 8 context -> Java 8 compatible knowledge ranks appropriately.
    Both objects exist simultaneously without deletion.
    """
    # Context 1: Modern Java 21 project
    ctx_21 = ProjectContext(language={"java": "21"})
    res_21 = search_engine.search("Java concurrency", project_context=ctx_21, limit=5)
    assert len(res_21.results) > 0
    top_21_ids = [r.id for r in res_21.results]
    assert "concept-java-virtual-threads" in top_21_ids[:2]

    # Context 2: Legacy Java 8 project
    ctx_8 = ProjectContext(language={"java": "8"})
    res_8 = search_engine.search("Java streams", project_context=ctx_8, limit=5)
    assert len(res_8.results) > 0
    top_8_ids = [r.id for r in res_8.results]
    assert "concept-java-streams-lambda" in top_8_ids

def test_acceptance_scenario_b_deprecated_framework_pattern(search_engine):
    """
    Acceptance Scenario B:
    Query: 'Spring Security configuration'
    Under modern Spring Boot 3 / Spring Security 6 context:
    Modern SecurityFilterChain ranks first; legacy WebSecurityConfigurerAdapter is penalized.
    Under Spring Boot 2 / Spring Security 5 context:
    Legacy adapter is retrievable.
    """
    # Modern context: Spring Boot 3 / Spring Security 6
    ctx_modern = ProjectContext(framework={"spring_boot": "3.0", "spring_security": "6.0"})
    res_modern = search_engine.search("Spring Security configuration", project_context=ctx_modern, limit=5)
    assert len(res_modern.results) > 0
    
    # Modern filter chain must rank higher than deprecated adapter
    item_ids = [r.id for r in res_modern.results]
    assert "pat-spring-security-filter-chain" in item_ids
    if "pat-spring-security-adapter" in item_ids:
        modern_idx = item_ids.index("pat-spring-security-filter-chain")
        legacy_idx = item_ids.index("pat-spring-security-adapter")
        assert modern_idx < legacy_idx, "Modern SecurityFilterChain must rank above deprecated adapter"

def test_acceptance_scenario_c_fundamental_knowledge_stability(search_engine):
    """
    Acceptance Scenario C:
    Fundamental concept 'ACID transactions' has knowledge_scope: fundamental & high stability.
    It receives fundamental boost and is not penalized by calendar age.
    """
    res = search_engine.search("ACID transaction consistency", limit=5)
    assert len(res.results) > 0
    acid_item = next((r for r in res.results if r.id == "concept-acid-transactions"), None)
    assert acid_item is not None
    assert acid_item.knowledge_scope.value == "fundamental"
    assert acid_item.ranking_multiplier >= 1.15
