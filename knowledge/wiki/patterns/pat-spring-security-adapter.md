---
id: pat-spring-security-adapter
type: pattern
title: WebSecurityConfigurerAdapter Pattern (Legacy Spring Security)
aliases:
  - Spring WebSecurityConfigurerAdapter
  - Legacy Spring Security Config
domains:
  - software_engineering
  - security
  - backend
tags:
  - spring
  - spring-security
  - spring5
  - deprecated
  - adapter
summary: Legacy inheritance-based Spring Security configuration pattern using WebSecurityConfigurerAdapter, deprecated in 5.7 and removed in 6.0.
relations:
  defined_by:
    - source-spring-security-5-migration
  related_to:
    - pat-spring-security-filter-chain
sources:
  - source-spring-security-5-migration
status: deprecated
knowledge_scope: version_specific
knowledge_stability: low
verification_status: source_backed
technology:
  name: spring_security
version:
  introduced_in: "3.1"
  deprecated_in: "5.7"
  removed_in: "6.0"
  max: "5.8"
replaced_by:
  - pat-spring-security-filter-chain
superseded_by:
  - pat-spring-security-filter-chain
evidence:
  - source_id: source-spring-security-5-migration
    tier: Tier A
    verification: source_backed
    version_context: "Spring Security 5.7"
    note: "Official deprecation notice recommending migration to SecurityFilterChain"
---

## Warning: Deprecated Pattern
> [!WARNING]
> `WebSecurityConfigurerAdapter` is deprecated in Spring Security 5.7 and completely removed in Spring Security 6.0 (Spring Boot 3.0). For modern projects, use `pat-spring-security-filter-chain`.

## Problem Statement
Configure HTTP authentication filters and endpoint authorizations in Spring Boot 2.x / Spring Security 5.x applications.

## Legacy Implementation
```java
@Configuration
@EnableWebSecurity
public class SecurityConfig extends WebSecurityConfigurerAdapter {
    @Override
    protected void configure(HttpSecurity http) throws Exception {
        http
            .authorizeRequests()
                .antMatchers("/public/**").permitAll()
                .anyRequest().authenticated()
            .and()
            .httpBasic();
    }
}
```

## Migration Guidance
Transition to component-based configuration by declaring a `@Bean SecurityFilterChain` method instead of extending `WebSecurityConfigurerAdapter`.
