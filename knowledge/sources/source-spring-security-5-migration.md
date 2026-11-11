---
id: source-spring-security-5-migration
type: source
title: Spring Security 5.7 Deprecation Notice & Migration Guide
aliases:
  - Spring Security 5.7 Guide
domains:
  - software_engineering
  - security
tags:
  - spring
  - spring-security
  - spring5
  - deprecation
summary: Official Spring Security guide announcing deprecation of WebSecurityConfigurerAdapter in 5.7 and full removal in 6.0.
sources: []
status: current
knowledge_scope: version_specific
knowledge_stability: medium
verification_status: source_backed
technology:
  name: spring_security
version:
  introduced_in: "5.7"
  deprecated_in: "5.7"
  removed_in: "6.0"
---

# Spring Security 5.7 Migration Guide
Publisher: VMware Tanzu / Spring Team

## Abstract
In Spring Security 5.7.0-M2, the `WebSecurityConfigurerAdapter` base class was deprecated. Users are encouraged to transition to a component-based security configuration by declaring a `SecurityFilterChain` bean. In Spring Security 6.0, `WebSecurityConfigurerAdapter` is completely removed.
