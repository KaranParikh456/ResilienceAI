import networkx as nx
from .schemas import Graph, Impact


def build_graph(scan_id, evidence):
    graph = nx.DiGraph()
    graph.add_nodes_from(n.id for n in evidence.nodes)
    graph.add_edges_from((e.source, e.target) for e in evidence.edges)
    services = {n.id for n in evidence.nodes if n.kind == 'service'}
    impacts = []
    for node in evidence.nodes:
        if node.kind == 'dependency':
            affected = sorted(nx.ancestors(graph, node.id) & services)
            impacts.append(Impact(dependency_id=node.id, potentially_affected_services=affected,
                                  evidence_refs=[f'scan:{scan_id}:node:{node.id}']))
    return Graph(scan_id=scan_id, nodes=evidence.nodes, edges=evidence.edges,
                 shared_dependencies=[i for i in impacts if len(i.potentially_affected_services) > 1],
                 predicted_impact=impacts, fixture=evidence.fixture)
