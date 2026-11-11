---
id: pat-spring-security-filter-chain
type: pattern
title: SecurityFilterChain Component Pattern (Modern Spring Security)
aliases:
  - Spring SecurityFilterChain
  - Modern Spring Security Config
domains:
  - software_engineering
  - security
  - backend
tags:
  - spring
  - spring-security
  - spring6
  - spring-boot-3
  - security-filter-chain
summary: Modern component-based Spring Security 6 configuration pattern declaring SecurityFilterChain beans with lambda DSLs.
relations:
  defined_by:
    - source-spring-security-6-docs
  related_to:
    - pat-spring-security-adapter
sources:
  - source-spring-security-6-docs
status: current
knowledge_scope: version_specific
knowledge_stability: medium
verification_status: verified
technology:
  name: spring_security
version:
  introduced_in: "5.7"
  min: "5.7"
evidence:
  - source_id: source-spring-security-6-docs
    tier: Tier A
    verification: verified
    version_context: "Spring Security 6.0 / Spring Boot 3.x"
---

## Goal / Purpose
Provide modular, component-based security configuration without extending framework base classes or exposing mutable internal state.

## Modern Implementation (Spring Boot 3 / Spring Security 6)
```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(authorize -> authorize
                .requestMatchers("/public/**").permitAll()
                .anyRequest().authenticated()
            )
            .httpBasic(Customizer.withDefaults());
        return http.build();
    }
}
```

## Key Advantages
- Avoids fragile base class inheritance.
- Utilizes type-safe Lambda DSL configurations.
- Enforces strict component encapsulation and modular filter registration.
