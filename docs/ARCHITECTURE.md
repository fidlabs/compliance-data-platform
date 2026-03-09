# Compliance Data Platform - Architecture Diagrams

This document contains visual architecture diagrams in Mermaid format that can be rendered in Markdown viewers that support Mermaid (GitHub, GitLab, many documentation tools).

## System Overview

```mermaid
graph TB
    subgraph Clients["External Clients"]
        Dashboard[Dashboards]
        API_Client[API Clients]
        Tools[Tools]
    end
    
    subgraph CDP["Compliance Data Platform"]
        subgraph API["API Layer"]
            Controllers[Controllers]
            Middleware[Middleware]
            Cache[Cache]
        end
        
        subgraph Services["Services Layer"]
            AllocatorSvc[Allocator Service]
            ClientSvc[Client Service]
            ProviderSvc[Storage Provider Service]
            ReportSvc[Report Services]
            ScoringSvc[Scoring Services]
            ExternalSvc[External API Services]
        end
        
        subgraph Jobs["Background Jobs"]
            Aggregation[Aggregation Tasks]
            ReportGen[Report Generators]
            IPNI[IPNI Fetcher]
        end
        
        subgraph Data["Data Layer"]
            Prisma[Prisma Service]
            PrismaDmob[Prisma DMOB]
            Postgres[Postgres Service]
            PostgresDmob[Postgres DMOB]
        end
        
        subgraph Monitor["Monitoring"]
            Prometheus[Prometheus Metrics]
            Health[Health Checks]
            Logging[Logging]
        end
    end
    
    subgraph External["External Services"]
        GitHub[GitHub API]
        Lotus[Lotus RPC]
        FilSpark[FilSpark API]
        CIDContact[CID Contact]
        Filscan[Filscan API]
    end
    
    subgraph Databases["Databases"]
        CDP_DB[(CDP PostgreSQL)]
        DMOB_DB[(DMOB PostgreSQL<br/>via SSH)]
    end
    
    Clients -->|HTTP/REST| API
    API --> Services
    Services --> Data
    Data --> Databases
    Services --> External
    Jobs --> Services
    Jobs --> Data
    Monitor --> API
    Monitor --> Services
    Monitor --> Jobs
    
    style Clients fill:#e1f5ff
    style CDP fill:#fff4e1
    style External fill:#f0f0f0
    style Databases fill:#e8f5e9
```

## Data Aggregation Pipeline

```mermaid
graph LR
    subgraph Source["DMOB Database"]
        UVD[unified_verified_deal]
        VCA[verified_client_allowance]
        VC[verified_client]
    end
    
    subgraph Hourly["Hourly Aggregations"]
        UVDH[unified_verified_deal_hourly]
        CCH[client_claims_hourly]
        PFC[provider_first_client]
    end
    
    subgraph Daily["Daily Aggregations"]
        PRD[provider_retrievability_daily]
        IRD[ipni_reporting_daily]
    end
    
    subgraph Weekly["Weekly Aggregations"]
        CPDW[client_provider_distribution_weekly]
        CADW[client_allocator_distribution_weekly]
        PW[providers_weekly]
        AW[allocators_weekly]
    end
    
    subgraph Accumulated["Accumulated Tables"]
        AWA[allocators_weekly_acc]
        PWA[providers_weekly_acc]
    end
    
    UVD --> UVDH
    UVDH --> CCH
    UVDH --> PFC
    UVD --> CPDW
    VCA --> CADW
    CPDW --> PW
    CADW --> AW
    PW --> AWA
    AW --> AWA
    PRD --> PW
    
    style Source fill:#ffebee
    style Hourly fill:#fff3e0
    style Daily fill:#e8f5e9
    style Weekly fill:#e3f2fd
    style Accumulated fill:#f3e5f5
```

## Request Flow - Allocator Compliance

```mermaid
sequenceDiagram
    participant Client
    participant Controller
    participant AllocatorService
    participant PrismaService
    participant PrismaDmobService
    participant GitHub
    
    Client->>Controller: GET /allocators/compliance-data
    Controller->>AllocatorService: getAllocators()
    AllocatorService->>PrismaDmobService: Query allocators
    PrismaDmobService->>GitHub: Fetch registry
    GitHub-->>PrismaDmobService: Allocator data
    PrismaDmobService-->>AllocatorService: Allocators
    AllocatorService->>AllocatorService: getWeekStandardAllocatorSpsCompliance()
    AllocatorService->>PrismaService: Query aggregated tables
    PrismaService-->>AllocatorService: Compliance data
    AllocatorService->>AllocatorService: calculateAllocatorComplianceScore()
    AllocatorService-->>Controller: Compliance results
    Controller-->>Client: Response
```

## Aggregation Job Flow

```mermaid
sequenceDiagram
    participant Cron
    participant AggregationService
    participant Runner1
    participant Runner2
    participant RunnerN
    participant PrismaDmob
    participant PrismaCDP
    participant ExternalAPI
    
    Cron->>AggregationService: Trigger (Every Hour)
    AggregationService->>AggregationService: Check job lock
    alt Job Available
        AggregationService->>Runner1: Execute
        Runner1->>PrismaDmob: Query source data
        PrismaDmob-->>Runner1: Raw data
        Runner1->>Runner1: Transform
        Runner1->>PrismaCDP: Insert aggregated data
        PrismaCDP-->>Runner1: Success
        
        AggregationService->>Runner2: Execute
        Runner2->>ExternalAPI: Fetch data
        ExternalAPI-->>Runner2: API response
        Runner2->>PrismaCDP: Insert data
        PrismaCDP-->>Runner2: Success
        
        AggregationService->>RunnerN: Execute
        RunnerN->>PrismaCDP: Query & aggregate
        RunnerN->>PrismaCDP: Insert results
        
        AggregationService->>AggregationService: Update metrics
        AggregationService->>AggregationService: Release lock
    else Job In Progress
        AggregationService-->>Cron: Skip execution
    end
```

## Report Generation Flow

```mermaid
sequenceDiagram
    participant Cron
    participant ReportJob
    participant GitHubService
    participant ReportService
    participant AllocatorService
    participant PrismaService
    participant Storage
    
    Cron->>ReportJob: Trigger (Daily 6 AM)
    ReportJob->>GitHubService: Fetch allocators registry
    GitHubService->>GitHub: API call
    GitHub-->>GitHubService: Allocator list
    GitHubService-->>ReportJob: Allocators
    
    loop For each allocator
        ReportJob->>ReportService: generateReport(allocatorId)
        ReportService->>AllocatorService: Get allocator data
        AllocatorService->>PrismaService: Query data
        PrismaService-->>AllocatorService: Data
        AllocatorService-->>ReportService: Allocator info
        
        ReportService->>ReportService: Calculate compliance
        ReportService->>ReportService: Generate report
        ReportService->>Storage: Save report
        Storage-->>ReportService: Success
        ReportService-->>ReportJob: Report generated
    end
    
    ReportJob->>ReportJob: Update metrics
```

## Component Architecture

```mermaid
graph TB
    subgraph Controllers["Controller Layer"]
        AC[AllocatorsController]
        CC[ClientsController]
        SC[StorageProvidersController]
        RC[ReportControllers]
        STC[StatsControllers]
    end
    
    subgraph Services["Service Layer"]
        AS[AllocatorService]
        CS[ClientService]
        SS[StorageProviderService]
        RS[ReportServices]
        SS2[ScoringServices]
    end
    
    subgraph External["External Services"]
        GH[GitHub Services]
        LT[Lotus API]
        FS[FilSpark]
        CC2[CID Contact]
    end
    
    subgraph Data["Data Access"]
        PS[PrismaService]
        PDS[PrismaDmobService]
        PGS[PostgresService]
        PGDS[PostgresDmobService]
    end
    
    subgraph DB["Databases"]
        CDP_DB[(CDP DB)]
        DMOB_DB[(DMOB DB)]
    end
    
    AC --> AS
    CC --> CS
    SC --> SS
    RC --> RS
    
    AS --> SS2
    AS --> PS
    AS --> PDS
    CS --> PS
    CS --> PDS
    SS --> PS
    
    AS --> GH
    SS --> LT
    SS --> FS
    SS --> CC2
    
    PS --> CDP_DB
    PDS --> DMOB_DB
    PGS --> CDP_DB
    PGDS --> DMOB_DB
    
    style Controllers fill:#e1f5ff
    style Services fill:#fff4e1
    style External fill:#f0f0f0
    style Data fill:#e8f5e9
    style DB fill:#ffebee
```

## Database Architecture

```mermaid
erDiagram
    DMOB_DB ||--o{ unified_verified_deal : contains
    DMOB_DB ||--o{ verified_client_allowance : contains
    DMOB_DB ||--o{ verified_client : contains
    
    unified_verified_deal_hourly ||--o{ providers_weekly : feeds
    unified_verified_deal_hourly ||--o{ client_provider_distribution_weekly : feeds
    unified_verified_deal_hourly ||--o{ client_claims_hourly : feeds
    
    client_provider_distribution_weekly ||--o{ providers_weekly : feeds
    client_allocator_distribution_weekly ||--o{ allocators_weekly : feeds
    
    providers_weekly ||--o{ allocators_weekly_acc : feeds
    allocators_weekly ||--o{ allocators_weekly_acc : feeds
    
    provider_retrievability_daily ||--o{ providers_weekly : feeds
    
    unified_verified_deal : has
    verified_client_allowance : has
    verified_client : has
    
    unified_verified_deal_hourly : aggregates
    client_provider_distribution_weekly : aggregates
    client_allocator_distribution_weekly : aggregates
    providers_weekly : aggregates
    allocators_weekly : aggregates
    allocators_weekly_acc : accumulates
```

## Job Scheduling Architecture

```mermaid
gantt
    title Aggregation and Report Job Schedule
    dateFormat HH:mm
    axisFormat %H:%M
    
    section Hourly Jobs
    Aggregation Tasks    :active, agg, 00:00, 1h
    Aggregation Tasks    :agg2, after agg, 1h
    Aggregation Tasks    :agg3, after agg2, 1h
    
    section Daily Jobs
    Allocator Reports    :crit, report, 06:00, 2h
    IPNI Fetcher         :ipni, 08:00, 1h
    
    section Weekly Jobs
    Weekly Aggregations  :weekly, 00:00, 4h
```

## Error Handling Flow

```mermaid
flowchart TD
    Request[API Request] --> Validate{Validate Input}
    Validate -->|Invalid| Error1[Return 400 Bad Request]
    Validate -->|Valid| Process[Process Request]
    
    Process --> Service{Service Call}
    Service -->|Success| DB{Database Query}
    Service -->|Error| Error2[Log Error]
    
    DB -->|Success| Cache{Cache Result}
    DB -->|Error| Error3[Log DB Error]
    DB -->|Timeout| Error4[Return 504 Timeout]
    
    Cache -->|Hit| Return1[Return Cached]
    Cache -->|Miss| Return2[Return Fresh]
    
    Error2 --> ErrorHandler[Error Handler Middleware]
    Error3 --> ErrorHandler
    Error4 --> ErrorHandler
    
    ErrorHandler --> Log[Log Error]
    ErrorHandler --> Format[Format Error Response]
    Format --> Return3[Return Error Response]
    
    Return1 --> Response[HTTP Response]
    Return2 --> Response
    Return3 --> Response
    Error1 --> Response
    
    style Error1 fill:#ffebee
    style Error2 fill:#ffebee
    style Error3 fill:#ffebee
    style Error4 fill:#ffebee
    style ErrorHandler fill:#fff3e0
```

## Cache Flow

```mermaid
flowchart LR
    Request[API Request] --> Cache{Cache Check}
    Cache -->|Hit| Return1[Return Cached]
    Cache -->|Miss| Process[Process Request]
    
    Process --> DB[Database Query]
    DB --> External[External API]
    External --> Transform[Transform Data]
    Transform --> Store[Store in Cache]
    Store --> Return2[Return Result]
    
    Return1 --> Response[HTTP Response]
    Return2 --> Response
    
    style Cache fill:#fff4e1
    style Store fill:#e1f5ff
```

## Monitoring Architecture

```mermaid
graph TB
    subgraph Application["Application"]
        API[API Endpoints]
        Services[Services]
        Jobs[Background Jobs]
    end
    
    subgraph Metrics["Metrics Collection"]
        Prometheus[Prometheus Client]
        CustomMetrics[Custom Metrics]
        HealthMetrics[Health Metrics]
    end
    
    subgraph Export["Metrics Export"]
        MetricsEndpoint[/metrics endpoint]
        HealthEndpoint[/health endpoint]
    end
    
    subgraph Monitoring["Monitoring Stack"]
        PrometheusServer[Prometheus Server]
        Grafana[Grafana Dashboards]
        Alerts[Alert Manager]
    end
    
    API --> Prometheus
    Services --> Prometheus
    Jobs --> Prometheus
    Prometheus --> CustomMetrics
    Prometheus --> HealthMetrics
    
    CustomMetrics --> MetricsEndpoint
    HealthMetrics --> HealthEndpoint
    
    MetricsEndpoint --> PrometheusServer
    HealthEndpoint --> PrometheusServer
    PrometheusServer --> Grafana
    PrometheusServer --> Alerts
    
    style Application fill:#e1f5ff
    style Metrics fill:#fff4e1
    style Export fill:#e8f5e9
    style Monitoring fill:#f3e5f5
```

## Deployment Architecture

```mermaid
graph TB
    subgraph Client["Client Layer"]
        Browser[Web Browser]
        API_Client[API Clients]
    end
    
    subgraph LoadBalancer["Load Balancer"]
        LB[NGINX/Cloud Load Balancer]
    end
    
    subgraph Application["Application Layer"]
        App1[CDP Instance 1]
        App2[CDP Instance 2]
        AppN[CDP Instance N]
    end
    
    subgraph Database["Database Layer"]
        CDP_Primary[(CDP PostgreSQL<br/>Primary)]
        CDP_Replica[(CDP PostgreSQL<br/>Replica)]
        DMOB_Tunnel[SSH Tunnel<br/>to DMOB]
    end
    
    subgraph External["External Services"]
        GitHub[GitHub API]
        Lotus[Lotus RPC]
        FilSpark[FilSpark API]
    end
    
    subgraph Monitoring["Monitoring"]
        Prometheus[Prometheus]
        Grafana[Grafana]
    end
    
    Browser --> LB
    API_Client --> LB
    LB --> App1
    LB --> App2
    LB --> AppN
    
    App1 --> CDP_Primary
    App2 --> CDP_Primary
    AppN --> CDP_Primary
    App1 --> CDP_Replica
    App2 --> CDP_Replica
    
    App1 --> DMOB_Tunnel
    App2 --> DMOB_Tunnel
    AppN --> DMOB_Tunnel
    
    App1 --> GitHub
    App1 --> Lotus
    App1 --> FilSpark
    App2 --> GitHub
    App2 --> Lotus
    
    App1 --> Prometheus
    App2 --> Prometheus
    Prometheus --> Grafana
    
    style Client fill:#e1f5ff
    style LoadBalancer fill:#fff4e1
    style Application fill:#e8f5e9
    style Database fill:#ffebee
    style External fill:#f0f0f0
    style Monitoring fill:#f3e5f5
```

## State Machine - Aggregation Job

```mermaid
stateDiagram-v2
    [*] --> Idle: Initialization
    
    Idle --> Running: Cron Trigger
    Running --> Locked: Acquire Lock
    
    Locked --> Processing: Start Processing
    Processing --> Runner1: Execute Runner 1
    Runner1 --> Runner2: Execute Runner 2
    Runner2 --> RunnerN: Execute Runner N
    RunnerN --> Updating: Update Metrics
    
    Updating --> Completed: Success
    Updating --> Failed: Error
    
    Completed --> Idle: Release Lock
    Failed --> Idle: Release Lock & Log Error
    
    note right of Locked
        Prevents concurrent
        execution
    end note
    
    note right of Processing
        Sequential execution
        of all runners
    end note
    
    note right of Failed
        Error logged
        Metrics updated
        Lock released
    end note
```

## Data Flow - Compliance Score Calculation

```mermaid
flowchart TD
    Start[Calculate Compliance Score] --> GetData[Get Allocator Data]
    GetData --> GetSPs[Get Storage Providers]
    GetSPs --> GetMetrics[Get Compliance Metrics]
    
    GetMetrics --> Check1{Retrievability<br/>Check}
    GetMetrics --> Check2{Location<br/>Check}
    GetMetrics --> Check3{IPNI<br/>Check}
    GetMetrics --> Check4{Other<br/>Checks}
    
    Check1 --> Score1[Score Component 1]
    Check2 --> Score2[Score Component 2]
    Check3 --> Score3[Score Component 3]
    Check4 --> Score4[Score Component 4]
    
    Score1 --> Aggregate[Aggregate Scores]
    Score2 --> Aggregate
    Score3 --> Aggregate
    Score4 --> Aggregate
    
    Aggregate --> Weight[Apply Weights]
    Weight --> Final[Final Compliance Score]
    Final --> Threshold{Above<br/>Threshold?}
    
    Threshold -->|Yes| Compliant[Compliant]
    Threshold -->|No| NonCompliant[Non-Compliant]
    
    Compliant --> End[Return Score]
    NonCompliant --> End
    
    style Start fill:#e1f5ff
    style Final fill:#fff4e1
    style Compliant fill:#e8f5e9
    style NonCompliant fill:#ffebee
```
