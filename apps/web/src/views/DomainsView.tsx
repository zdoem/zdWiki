"use client";

import React, { useState, useMemo } from "react";
import { useConsole } from "@/store/consoleStore";
import { DOMAIN_CATEGORIES, findDomainArea } from "@/lib/domains";
import { Panel, Card, Button, Badge, LifecycleBadge, TypeBadge } from "@/components/ui";
import { IconDomain, IconSearch, IconRefresh, IconCheck, getTypeIcon } from "@/components/icons";

const KNOWLEDGE_TYPES = [
  "concept",
  "technology",
  "pattern",
  "architecture",
  "test",
  "bug",
  "debug_playbook",
  "decision",
  "analysis",
];

export const DomainsView: React.FC = () => {
  const {
    knowledgeList,
    domainFilter,
    setDomainFilter,
    typeFilter,
    setTypeFilter,
    openDetail,
    refreshData,
    isLoading,
    theme,
  } = useConsole();

  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>(typeFilter || "ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedVerification, setSelectedVerification] = useState<string>("ALL");

  const isSpace = theme === "space-hud";

  // Identify active domain category / area
  const activeDomainInfo = useMemo(() => {
    if (!domainFilter || domainFilter === "ALL") return null;
    return findDomainArea(domainFilter);
  }, [domainFilter]);

  // Compute live counts per domain
  const domainCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    DOMAIN_CATEGORIES.forEach((cat) => {
      // Category count: match either category name/id or any of its area ids/tags
      const catAreaIds = new Set(cat.areas.map((a) => a.id.toLowerCase()));
      const catAreaTags = new Set(cat.areas.flatMap((a) => a.tags.map((t) => t.toLowerCase())));

      const matching = knowledgeList.filter((k) => {
        const itemDomains = k.domains.map((d) => d.toLowerCase());
        const itemTags = k.tags.map((t) => t.toLowerCase());
        return (
          itemDomains.includes(cat.id.toLowerCase()) ||
          itemDomains.includes(cat.name.toLowerCase()) ||
          itemDomains.some((d) => catAreaIds.has(d)) ||
          itemTags.some((t) => catAreaTags.has(t))
        );
      });
      counts[cat.id] = matching.length;

      // Sub-area counts
      cat.areas.forEach((area) => {
        const areaTags = new Set(area.tags.map((t) => t.toLowerCase()));
        const areaMatching = knowledgeList.filter((k) => {
          const itemDomains = k.domains.map((d) => d.toLowerCase());
          const itemTags = k.tags.map((t) => t.toLowerCase());
          return (
            itemDomains.includes(area.id.toLowerCase()) ||
            itemDomains.includes(area.name.toLowerCase()) ||
            itemTags.some((t) => areaTags.has(t))
          );
        });
        counts[area.id] = areaMatching.length;
      });
    });
    return counts;
  }, [knowledgeList]);

  // Filtered knowledge objects for the active domain
  const domainObjects = useMemo(() => {
    if (!domainFilter || domainFilter === "ALL") {
      return knowledgeList;
    }
    const filterNorm = domainFilter.toLowerCase().replace(/[\s\-_/]/g, "");

    return knowledgeList.filter((k) => {
      const itemDomainsNorm = k.domains.map((d) => d.toLowerCase().replace(/[\s\-_/]/g, ""));
      const itemTagsNorm = k.tags.map((t) => t.toLowerCase().replace(/[\s\-_/]/g, ""));

      // Direct match on domain or tag
      if (itemDomainsNorm.includes(filterNorm) || itemTagsNorm.includes(filterNorm)) {
        return true;
      }

      // Check if filter is a category and item matches any of its sub-areas
      const { category } = findDomainArea(domainFilter);
      if (category) {
        const areaNorms = category.areas.map((a) => a.id.toLowerCase().replace(/[\s\-_/]/g, ""));
        const areaTagsNorm = category.areas.flatMap((a) => a.tags.map((t) => t.toLowerCase().replace(/[\s\-_/]/g, "")));
        return (
          itemDomainsNorm.some((d) => areaNorms.includes(d)) ||
          itemTagsNorm.some((t) => areaTagsNorm.includes(t))
        );
      }

      return false;
    });
  }, [knowledgeList, domainFilter]);

  // Type breakdown counts for the active domain
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    KNOWLEDGE_TYPES.forEach((t) => {
      counts[t] = domainObjects.filter((k) => k.type.toLowerCase() === t.toLowerCase()).length;
    });
    return counts;
  }, [domainObjects]);

  // Final filtered list with search + cross filters
  const filteredList = useMemo(() => {
    return domainObjects.filter((item) => {
      const matchSearch =
        !search.trim() ||
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.id.toLowerCase().includes(search.toLowerCase()) ||
        item.summary.toLowerCase().includes(search.toLowerCase()) ||
        item.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));

      const matchType = selectedType === "ALL" || item.type.toLowerCase() === selectedType.toLowerCase();
      const currentStatus = item.lifecycle_status || item.status || "current";
      const matchStatus = selectedStatus === "ALL" || currentStatus.toLowerCase() === selectedStatus.toLowerCase();
      const currentVerif = item.verification_status || "source_backed";
      const matchVerif = selectedVerification === "ALL" || currentVerif.toLowerCase() === selectedVerification.toLowerCase();

      return matchSearch && matchType && matchStatus && matchVerif;
    });
  }, [domainObjects, search, selectedType, selectedStatus, selectedVerification]);

  const handleSelectDomain = (d: string | null) => {
    setDomainFilter(d);
    setSelectedType("ALL");
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-surface border border-hairline text-brass">
              <IconDomain size={18} />
            </span>
            <h1 className="font-heading text-xl font-bold text-textMain tracking-tight">
              {domainFilter && domainFilter !== "ALL"
                ? `${activeDomainInfo?.area?.name || activeDomainInfo?.category?.name || domainFilter} Domain`
                : "Engineering Domains Taxonomy"}
            </h1>
          </div>
          <p className="text-xs text-textDim font-mono mt-1">
            {domainFilter && domainFilter !== "ALL"
              ? activeDomainInfo?.category?.description || "Domain-oriented knowledge explorer with real object taxonomy & verification."
              : "Explore the engineering knowledge repository by specialized domain competency."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {domainFilter && domainFilter !== "ALL" && (
            <Button variant="ghost" size="sm" onClick={() => handleSelectDomain(null)}>
              View All Domains
            </Button>
          )}
          <Button variant="outline" size="sm" icon={<IconRefresh size={14} />} onClick={refreshData} disabled={isLoading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* When NO specific domain is selected: Show High-level Domain Cards */}
      {(!domainFilter || domainFilter === "ALL") && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DOMAIN_CATEGORIES.map((cat) => (
            <Card
              key={cat.id}
              className="hover:border-brass/40 cursor-pointer transition-all duration-200 flex flex-col justify-between group"
              onClick={() => handleSelectDomain(cat.id)}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-brass uppercase tracking-wider">
                    {cat.name}
                  </span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-surfaceElevated border border-hairline text-textMuted font-semibold">
                    {domainCounts[cat.id] || 0} Objects
                  </span>
                </div>
                <p className="text-xs text-textDim line-clamp-2 leading-relaxed mb-4">
                  {cat.description}
                </p>

                {/* Sub-areas pill list */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {cat.areas.slice(0, 6).map((area) => (
                    <button
                      key={area.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectDomain(area.id);
                      }}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface hover:bg-surfaceHighlight text-textMuted hover:text-textMain border border-hairline transition-colors"
                    >
                      {area.name} ({domainCounts[area.id] || 0})
                    </button>
                  ))}
                  {cat.areas.length > 6 && (
                    <span className="text-[10px] font-mono text-textDim self-center">
                      +{cat.areas.length - 6} more
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-hairline/60 flex items-center justify-between text-xs font-mono text-textDim group-hover:text-brass transition-colors">
                <span>Explore Domain</span>
                <span>→</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* When a domain IS selected: Show Domain Taxonomy Grid + Object Filter Table */}
      {domainFilter && domainFilter !== "ALL" && (
        <>
          {/* Domain Breakdown by Knowledge Type */}
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-textDim mb-2.5 font-semibold">
              Taxonomy Breakdown in this Domain ({domainObjects.length} Total Objects)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {KNOWLEDGE_TYPES.map((type) => {
                const count = typeCounts[type] || 0;
                const isSelected = selectedType.toLowerCase() === type.toLowerCase();
                return (
                  <div
                    key={type}
                    onClick={() => setSelectedType(isSelected ? "ALL" : type)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? isSpace
                          ? "bg-[var(--sidebar-active-bg)] border-[var(--sidebar-active-border)] shadow-sm"
                          : "bg-brass/15 border-brass/40 shadow-sm"
                        : "bg-surface border-hairline hover:border-textDim/40"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-textDim">{getTypeIcon(type, { size: 14 })}</span>
                      <span className={`font-mono font-bold ${count > 0 ? (isSpace ? "text-[#ffb24d]" : "text-brass") : "text-textDim"}`}>
                        {count}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono font-semibold text-textMain capitalize truncate">
                      {type.replace(/_/g, " ")}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sub-areas selector row if in parent domain category */}
          {activeDomainInfo?.category && (
            <div className="p-3 rounded-lg bg-surface border border-hairline text-xs font-mono">
              <span className="text-textDim mr-2">Sub-areas:</span>
              <div className="inline-flex flex-wrap gap-1.5 mt-1 sm:mt-0">
                <button
                  onClick={() => handleSelectDomain(activeDomainInfo.category!.id)}
                  className={`px-2 py-0.5 rounded border transition-colors ${
                    domainFilter.toLowerCase() === activeDomainInfo.category!.id.toLowerCase()
                      ? "bg-brass text-canvas font-bold border-brass"
                      : "bg-surfaceElevated text-textMuted border-hairline hover:text-textMain"
                  }`}
                >
                  All {activeDomainInfo.category.name}
                </button>
                {activeDomainInfo.category.areas.map((area) => (
                  <button
                    key={area.id}
                    onClick={() => handleSelectDomain(area.id)}
                    className={`px-2 py-0.5 rounded border transition-colors ${
                      domainFilter.toLowerCase() === area.id.toLowerCase()
                        ? "bg-brass text-canvas font-bold border-brass"
                        : "bg-surfaceElevated text-textMuted border-hairline hover:text-textMain"
                    }`}
                  >
                    {area.name} ({domainCounts[area.id] || 0})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cross-Filtering & Search Toolbar */}
          <Panel className="!p-4">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Search Bar */}
              <div className="flex-1 relative">
                <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textDim" />
                <input
                  type="text"
                  placeholder="Filter objects in this domain by title, tag, summary..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-surface border border-hairline rounded-lg text-sm text-textMain placeholder-textDim focus:border-brass/50 outline-none"
                />
              </div>

              {/* Type Filter */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 bg-surface border border-hairline rounded-lg text-xs font-mono text-textMuted focus:border-brass/50 outline-none"
              >
                <option value="ALL">Type: ALL</option>
                {KNOWLEDGE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    Type: {t.toUpperCase().replace(/_/g, " ")} ({typeCounts[t] || 0})
                  </option>
                ))}
              </select>

              {/* Lifecycle Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 bg-surface border border-hairline rounded-lg text-xs font-mono text-textMuted focus:border-brass/50 outline-none"
              >
                <option value="ALL">Lifecycle: ALL</option>
                <option value="current">Current</option>
                <option value="legacy">Legacy</option>
                <option value="deprecated">Deprecated</option>
                <option value="superseded">Superseded</option>
                <option value="archived">Archived</option>
              </select>

              {/* Verification Filter */}
              <select
                value={selectedVerification}
                onChange={(e) => setSelectedVerification(e.target.value)}
                className="px-3 py-2 bg-surface border border-hairline rounded-lg text-xs font-mono text-textMuted focus:border-brass/50 outline-none"
              >
                <option value="ALL">Verification: ALL</option>
                <option value="verified">Verified</option>
                <option value="tested">Tested</option>
                <option value="source_backed">Source-backed</option>
                <option value="unverified">Unverified</option>
              </select>
            </div>
          </Panel>

          {/* Filtered Objects Table */}
          <Panel title={`Domain Objects (${filteredList.length})`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs font-mono text-textDim border-b border-hairline bg-surface/30">
                  <tr>
                    <th className="px-4 py-2.5">ID / Type</th>
                    <th className="px-4 py-2.5">Title & Summary</th>
                    <th className="px-4 py-2.5">Lifecycle</th>
                    <th className="px-4 py-2.5">Verification</th>
                    <th className="px-4 py-2.5">Domains & Tags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {filteredList.length > 0 ? (
                    filteredList.map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => openDetail(item.id)}
                        className="hover:bg-surfaceHighlight/60 cursor-pointer transition-colors group"
                      >
                        <td className="px-4 py-3 align-top w-48">
                          <div className="font-mono text-xs text-brass font-medium group-hover:text-brass-light truncate">
                            {item.id}
                          </div>
                          <div className="mt-1">
                            <TypeBadge type={item.type} />
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top max-w-md">
                          <div className="font-medium text-textMain text-sm group-hover:text-brass transition-colors">
                            {item.title}
                          </div>
                          <div className="text-xs text-textDim line-clamp-2 mt-0.5 leading-relaxed">
                            {item.summary || "No summary provided"}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top whitespace-nowrap">
                          <LifecycleBadge status={item.lifecycle_status || item.status} />
                        </td>
                        <td className="px-4 py-3 align-top whitespace-nowrap">
                          <Badge variant="mono" size="sm">
                            {item.verification_status || "source_backed"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {item.domains.map((d) => (
                              <span
                                key={d}
                                className="text-[10px] font-mono text-cyan bg-cyan/10 border border-cyan/30 px-1.5 py-0.5 rounded"
                              >
                                {d}
                              </span>
                            ))}
                            {item.tags.slice(0, 2).map((t) => (
                              <span
                                key={t}
                                className="text-[10px] font-mono text-textDim bg-surface px-1.5 py-0.5 rounded border border-hairline"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-textDim font-mono text-sm">
                        No matching knowledge objects in this domain filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
};
