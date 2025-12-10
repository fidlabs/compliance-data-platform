--
-- PostgreSQL database dump
--

-- Dumped from database version 14.13
-- Dumped by pg_dump version 17.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: pageinspect; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pageinspect WITH SCHEMA public;


--
-- Name: EXTENSION pageinspect; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pageinspect IS 'inspect the contents of database pages at a low level';


--
-- Name: bot_event_eventtype_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.bot_event_eventtype_enum AS ENUM (
    'create_application',
    'multisig_creation',
    'first_datacap_request',
    'datacap_allocation',
    'subsequent_datacap_request',
    'application_is_good',
    'application_has_errors'
);


--
-- Name: verified_deal_state_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.verified_deal_state_enum AS ENUM (
    'active',
    'unknown'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._migrations (
    id integer NOT NULL,
    "timestamp" bigint NOT NULL,
    name character varying NOT NULL
);


--
-- Name: _migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public._migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: _migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public._migrations_id_seq OWNED BY public._migrations.id;


--
-- Name: address_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.address_cache (
    id integer NOT NULL,
    "addressId" character varying NOT NULL,
    address character varying NOT NULL,
    "isMultisig" boolean NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: address_cache_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.address_cache_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: address_cache_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.address_cache_id_seq OWNED BY public.address_cache.id;


--
-- Name: allocator_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.allocator_info (
    id integer NOT NULL,
    "applicationNumber" character varying,
    address character varying,
    "addressId" character varying,
    name character varying DEFAULT false NOT NULL,
    organization character varying DEFAULT false NOT NULL,
    "allocationBookkeeping" character varying DEFAULT false NOT NULL,
    "fullInfo" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: allocator_info_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.allocator_info_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: allocator_info_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.allocator_info_id_seq OWNED BY public.allocator_info.id;


--
-- Name: api_key; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_key (
    id integer NOT NULL,
    "githubId" character varying,
    key character varying,
    "isAdmin" boolean DEFAULT false NOT NULL
);


--
-- Name: api_key_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.api_key_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: api_key_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.api_key_id_seq OWNED BY public.api_key.id;


--
-- Name: api_key_request; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_key_request (
    id integer NOT NULL,
    "githubId" character varying,
    challenge character varying
);


--
-- Name: api_key_request_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.api_key_request_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: api_key_request_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.api_key_request_id_seq OWNED BY public.api_key_request.id;


--
-- Name: api_key_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_key_usage (
    id integer NOT NULL,
    route character varying,
    key character varying,
    ip character varying,
    "timestamp" integer,
    "statusCode" integer,
    "statusCodeClass" character varying
);


--
-- Name: api_key_usage_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.api_key_usage_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: api_key_usage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.api_key_usage_id_seq OWNED BY public.api_key_usage.id;


--
-- Name: backfill_ranges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.backfill_ranges (
    "hashId" character varying NOT NULL,
    start integer NOT NULL,
    "end" integer NOT NULL,
    crt integer NOT NULL,
    "crtForProcessing" integer
);


--
-- Name: bot_event; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bot_event (
    id integer NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    environment character varying,
    repo character varying,
    "issueNumber" character varying,
    "timeStamp" timestamp without time zone,
    "eventType" public.bot_event_eventtype_enum DEFAULT 'create_application'::public.bot_event_eventtype_enum NOT NULL,
    params jsonb DEFAULT '{}'::jsonb NOT NULL,
    "allocationUUID" character varying
);


--
-- Name: bot_event_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bot_event_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bot_event_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bot_event_id_seq OWNED BY public.bot_event.id;


--
-- Name: client_uuid; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_uuid (
    id integer NOT NULL,
    uuid character varying NOT NULL,
    "ghLogin" character varying,
    "ghId" integer NOT NULL
);


--
-- Name: client_uuid_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.client_uuid_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: client_uuid_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.client_uuid_id_seq OWNED BY public.client_uuid.id;


--
-- Name: cron_running_state; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cron_running_state (
    id integer NOT NULL,
    key character varying,
    "isRunning" boolean DEFAULT false NOT NULL,
    "lastRunHasError" boolean DEFAULT false NOT NULL,
    "lastRunError" character varying DEFAULT ''::character varying NOT NULL,
    "crtRunStartTimestamp" integer DEFAULT 1742208765 NOT NULL,
    "lastRunStartTimestamp" integer DEFAULT 1742208765 NOT NULL,
    "lastRunFinishTimestamp" integer DEFAULT 1742208765 NOT NULL
);


--
-- Name: cron_running_state_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cron_running_state_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cron_running_state_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cron_running_state_id_seq OWNED BY public.cron_running_state.id;


--
-- Name: dc_allocated_to_clients_grouped_by_verifiers_wow; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dc_allocated_to_clients_grouped_by_verifiers_wow (
    id integer NOT NULL,
    "startHeight" integer,
    "endHeight" integer,
    year integer,
    week integer,
    "verifierAddressId" character varying,
    amount character varying
);


--
-- Name: dc_allocated_to_clients_grouped_by_verifiers_wow_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dc_allocated_to_clients_grouped_by_verifiers_wow_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dc_allocated_to_clients_grouped_by_verifiers_wow_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dc_allocated_to_clients_grouped_by_verifiers_wow_id_seq OWNED BY public.dc_allocated_to_clients_grouped_by_verifiers_wow.id;


--
-- Name: dc_allocated_to_clients_total_by_week; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dc_allocated_to_clients_total_by_week (
    id integer NOT NULL,
    "startHeight" integer,
    year integer,
    week integer,
    amount character varying
);


--
-- Name: dc_allocated_to_clients_total_by_week_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dc_allocated_to_clients_total_by_week_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dc_allocated_to_clients_total_by_week_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dc_allocated_to_clients_total_by_week_id_seq OWNED BY public.dc_allocated_to_clients_total_by_week.id;


--
-- Name: dc_allocation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dc_allocation (
    id integer NOT NULL,
    "allocationId" integer,
    "clientId" character varying,
    "providerId" character varying,
    removed boolean DEFAULT false,
    "pieceCid" character varying,
    "pieceSize" integer,
    "termMax" integer,
    "termMin" integer,
    expiration integer,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: dc_allocation_claim; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dc_allocation_claim (
    id integer NOT NULL,
    type character varying,
    "clientId" character varying,
    "providerId" character varying,
    "sectorId" character varying,
    removed boolean DEFAULT false,
    "pieceCid" character varying,
    "pieceSize" numeric,
    "termMax" integer,
    "prevTermMax" integer,
    "termMin" integer,
    "termStart" integer,
    expiration integer,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "dealId" integer DEFAULT 0 NOT NULL,
    "syncStatus" integer DEFAULT 0 NOT NULL
);


--
-- Name: dc_allocation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dc_allocation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dc_allocation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dc_allocation_id_seq OWNED BY public.dc_allocation.id;


--
-- Name: dc_allocation_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dc_allocation_messages (
    "msgCid" character varying NOT NULL,
    "to" character varying,
    "from" character varying,
    "f07ImediateCaller" character varying,
    "executionChain" jsonb,
    processed boolean DEFAULT false NOT NULL
);


--
-- Name: dc_claim; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dc_claim (
    id integer NOT NULL,
    "claimId" integer,
    "clientId" character varying,
    "providerId" character varying,
    "sectorId" character varying,
    removed boolean DEFAULT false,
    "pieceCid" character varying,
    "pieceSize" integer,
    "termMax" integer,
    "prevTermMax" integer,
    "termMin" integer,
    expiration integer,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: dc_claim_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dc_claim_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dc_claim_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dc_claim_id_seq OWNED BY public.dc_claim.id;


--
-- Name: dc_update_events_with_dc_spend; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dc_update_events_with_dc_spend (
    id integer NOT NULL,
    "claimId" integer,
    "clientId" character varying,
    "providerId" character varying,
    "sectorId" character varying,
    removed boolean DEFAULT false,
    "pieceCid" character varying,
    "pieceSize" numeric,
    "termMax" integer,
    "termMin" integer,
    "termStart" integer,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "msgCid" character varying
);


--
-- Name: dc_update_events_with_dc_spend_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dc_update_events_with_dc_spend_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dc_update_events_with_dc_spend_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dc_update_events_with_dc_spend_id_seq OWNED BY public.dc_update_events_with_dc_spend.id;


--
-- Name: dc_update_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dc_update_messages (
    "msgCid" character varying NOT NULL,
    "to" character varying,
    "from" character varying,
    reason character varying,
    "usesDc" boolean DEFAULT false NOT NULL,
    processed boolean DEFAULT false NOT NULL
);


--
-- Name: dc_used_by_clients_wow; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dc_used_by_clients_wow (
    id integer NOT NULL,
    "startHeight" integer,
    "endHeight" integer,
    year integer,
    week integer,
    "clientAddressId" character varying,
    amount character varying
);


--
-- Name: dc_used_by_clients_wow_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dc_used_by_clients_wow_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dc_used_by_clients_wow_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dc_used_by_clients_wow_id_seq OWNED BY public.dc_used_by_clients_wow.id;


--
-- Name: dc_verifier_update; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dc_verifier_update (
    id integer NOT NULL,
    "hashId" character varying,
    type character varying,
    "clientId" character varying,
    "verifierId" character varying,
    "dcAmount" numeric,
    height integer,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    processed boolean DEFAULT true NOT NULL,
    "verifierAddressEth" character varying DEFAULT ''::character varying NOT NULL,
    "dcSource" character varying DEFAULT 'f080'::character varying NOT NULL
);


--
-- Name: dc_verifier_update_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dc_verifier_update_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dc_verifier_update_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dc_verifier_update_id_seq OWNED BY public.dc_verifier_update.id;


--
-- Name: event_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_log (
    id integer NOT NULL,
    "hashId" character varying,
    "msgCid" character varying,
    "tipsetKey" character varying,
    height integer,
    reverted boolean DEFAULT false NOT NULL,
    emitter character varying DEFAULT false NOT NULL,
    error character varying DEFAULT false NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    type character varying,
    "allocationClaimId" character varying,
    entries jsonb DEFAULT '{}'::jsonb NOT NULL,
    backfilled boolean DEFAULT false NOT NULL,
    processed boolean DEFAULT false NOT NULL
);


--
-- Name: event_log_eth; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_log_eth (
    id integer NOT NULL,
    address character varying,
    data character varying,
    topics jsonb DEFAULT '[]'::jsonb NOT NULL,
    removed boolean DEFAULT false NOT NULL,
    "logIndex" integer,
    "transactionIndex" integer,
    "transactionHash" character varying,
    "blockHash" character varying,
    "blockNumber" character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: event_log_eth_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.event_log_eth_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: event_log_eth_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.event_log_eth_id_seq OWNED BY public.event_log_eth.id;


--
-- Name: event_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.event_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: event_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.event_log_id_seq OWNED BY public.event_log.id;


--
-- Name: failed_decode_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.failed_decode_log (
    id integer NOT NULL,
    "hashId" character varying,
    event jsonb DEFAULT '{}'::jsonb NOT NULL,
    error character varying DEFAULT false NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: failed_decode_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.failed_decode_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: failed_decode_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.failed_decode_log_id_seq OWNED BY public.failed_decode_log.id;


--
-- Name: filfox_message; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.filfox_message (
    id integer NOT NULL,
    "msgCID" character varying,
    height integer,
    "from" character varying,
    "to" character varying,
    method character varying
);


--
-- Name: filfox_message_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.filfox_message_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: filfox_message_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.filfox_message_id_seq OWNED BY public.filfox_message.id;


--
-- Name: gh_allocation_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gh_allocation_info (
    id character varying NOT NULL,
    "clientId" character varying NOT NULL,
    type character varying NOT NULL,
    "createdAt" character varying NOT NULL,
    "updatedAt" character varying NOT NULL,
    active character varying NOT NULL,
    amount character varying NOT NULL
);


--
-- Name: gh_allocation_signer_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gh_allocation_signer_info (
    id integer NOT NULL,
    "allocationId" character varying NOT NULL,
    "ghUsername" character varying NOT NULL,
    "signingAddress" character varying NOT NULL,
    "createdAt" character varying NOT NULL,
    "msgCid" character varying NOT NULL
);


--
-- Name: gh_allocation_signer_info_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gh_allocation_signer_info_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gh_allocation_signer_info_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gh_allocation_signer_info_id_seq OWNED BY public.gh_allocation_signer_info.id;


--
-- Name: gh_allocator_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gh_allocator_info (
    id integer NOT NULL,
    "applicationNumber" character varying,
    address character varying,
    "addressId" character varying,
    name character varying DEFAULT false NOT NULL,
    organization character varying DEFAULT false NOT NULL,
    "allocationBookkeeping" character varying DEFAULT false NOT NULL,
    "fullInfo" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "pathwayAddresses" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "isVirtual" boolean DEFAULT false NOT NULL
);


--
-- Name: gh_allocator_info_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gh_allocator_info_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gh_allocator_info_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gh_allocator_info_id_seq OWNED BY public.gh_allocator_info.id;


--
-- Name: gh_client_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gh_client_info (
    id character varying NOT NULL,
    version character varying NOT NULL,
    url character varying NOT NULL,
    client jsonb DEFAULT '{}'::jsonb NOT NULL,
    project jsonb DEFAULT '{}'::jsonb NOT NULL,
    datacap jsonb DEFAULT '{}'::jsonb NOT NULL,
    lifecycle jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: gh_data_cap_request; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gh_data_cap_request (
    id integer NOT NULL,
    "messageId" character varying,
    "issueId" integer,
    "verifierAddressId" character varying,
    "applicantName" character varying,
    "applicantLocation" character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: gh_data_cap_request_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gh_data_cap_request_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gh_data_cap_request_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gh_data_cap_request_id_seq OWNED BY public.gh_data_cap_request.id;


--
-- Name: gh_datacap_allocation_request_comment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gh_datacap_allocation_request_comment (
    id integer NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "commentCreatedAt" timestamp without time zone,
    "commentUpdatedAt" timestamp without time zone,
    "issueId" integer,
    "commentUrl" character varying NOT NULL,
    "commentIsEdited" boolean DEFAULT false NOT NULL,
    "approverGhUserId" integer NOT NULL,
    "datacapRequestedRaw" character varying NOT NULL,
    "datacapRequested" numeric,
    "clientAddress" character varying,
    "notaryAddress" character varying,
    "allocationUUID" character varying,
    "requestNumber" integer
);


--
-- Name: gh_datacap_allocation_request_comment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gh_datacap_allocation_request_comment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gh_datacap_allocation_request_comment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gh_datacap_allocation_request_comment_id_seq OWNED BY public.gh_datacap_allocation_request_comment.id;


--
-- Name: gh_datacap_allocation_signed_comment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gh_datacap_allocation_signed_comment (
    id integer NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "commentCreatedAt" timestamp without time zone,
    "commentUpdatedAt" timestamp without time zone,
    "issueId" integer,
    "commentUrl" character varying NOT NULL,
    "commentIsEdited" boolean DEFAULT false NOT NULL,
    "approverGhUserId" integer NOT NULL,
    "datacapAllocatedRaw" character varying NOT NULL,
    "datacapAllocated" numeric,
    "clientAddress" character varying,
    "signerAddress" character varying,
    "operationType" character varying,
    "messageCid" character varying,
    "allocationUUID" character varying
);


--
-- Name: gh_datacap_allocation_signed_comment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gh_datacap_allocation_signed_comment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gh_datacap_allocation_signed_comment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gh_datacap_allocation_signed_comment_id_seq OWNED BY public.gh_datacap_allocation_signed_comment.id;


--
-- Name: gh_datacap_issue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gh_datacap_issue (
    id integer NOT NULL,
    "issueNumber" integer NOT NULL,
    "issueUrl" character varying NOT NULL,
    "issueCreatedAt" timestamp without time zone,
    "datacapRequestedRaw" character varying,
    "datacapRequested" numeric,
    "issueClosedAt" timestamp without time zone,
    labels jsonb,
    "user" jsonb
);


--
-- Name: gh_datacap_issue_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gh_datacap_issue_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gh_datacap_issue_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gh_datacap_issue_id_seq OWNED BY public.gh_datacap_issue.id;


--
-- Name: gh_datacap_request_comment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gh_datacap_request_comment (
    id integer NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "commentUrl" character varying NOT NULL,
    "commentIsEdited" boolean DEFAULT false NOT NULL,
    "commentIsLast" boolean NOT NULL,
    "approverGhUserId" integer NOT NULL,
    "datacapRequestedRaw" character varying NOT NULL,
    "datacapRequested" numeric,
    "weeklyDatacapUsageRaw" character varying NOT NULL,
    "weeklyDatacapUsage" numeric,
    "clientAddress" character varying,
    "commentCreatedAt" timestamp without time zone,
    "commentUpdatedAt" timestamp without time zone,
    "issueId" integer
);


--
-- Name: gh_datacap_request_comment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gh_datacap_request_comment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gh_datacap_request_comment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gh_datacap_request_comment_id_seq OWNED BY public.gh_datacap_request_comment.id;


--
-- Name: gh_issue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gh_issue (
    id integer NOT NULL,
    "issueId" integer NOT NULL,
    "repoId" integer NOT NULL,
    closed boolean DEFAULT false NOT NULL,
    "processedAllocationMessage" boolean DEFAULT false NOT NULL,
    "userHandle" character varying,
    "commentsUrl" character varying,
    "gotResponse" boolean,
    "gotAllocation" boolean,
    "creationTimestamp" timestamp without time zone,
    "firstResponseTimestamp" timestamp without time zone,
    "startSigningTimestamp" timestamp without time zone,
    "allocationMessageId" character varying,
    "clientName" character varying,
    "clientAddress" character varying,
    datacap character varying,
    region character varying,
    "notaryRequestedName" character varying
);


--
-- Name: gh_issue_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gh_issue_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gh_issue_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gh_issue_id_seq OWNED BY public.gh_issue.id;


--
-- Name: glif_data_cap_request; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.glif_data_cap_request (
    id integer NOT NULL,
    "messageId" character varying,
    "githubId" character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: glif_data_cap_request_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.glif_data_cap_request_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: glif_data_cap_request_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.glif_data_cap_request_id_seq OWNED BY public.glif_data_cap_request.id;


--
-- Name: global_values; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.global_values (
    id integer NOT NULL,
    key character varying,
    value character varying
);


--
-- Name: global_values_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.global_values_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: global_values_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.global_values_id_seq OWNED BY public.global_values.id;


--
-- Name: historic_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.historic_data (
    id integer NOT NULL,
    head character varying,
    code character varying,
    state character varying,
    height integer,
    status integer DEFAULT 0
);


--
-- Name: historic_data_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.historic_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: historic_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.historic_data_id_seq OWNED BY public.historic_data.id;


--
-- Name: leaderboard_api_key; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leaderboard_api_key (
    id integer NOT NULL,
    "githubId" character varying,
    key character varying
);


--
-- Name: leaderboard_api_key_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.leaderboard_api_key_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: leaderboard_api_key_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.leaderboard_api_key_id_seq OWNED BY public.leaderboard_api_key.id;


--
-- Name: leaderboard_api_key_request; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leaderboard_api_key_request (
    id integer NOT NULL,
    "githubId" character varying,
    challenge character varying
);


--
-- Name: leaderboard_api_key_request_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.leaderboard_api_key_request_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: leaderboard_api_key_request_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.leaderboard_api_key_request_id_seq OWNED BY public.leaderboard_api_key_request.id;


--
-- Name: leaderboard_processed_allocation_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leaderboard_processed_allocation_data (
    id integer NOT NULL,
    "addressId" character varying,
    "verifierAddressId" character varying,
    "datacapReceived" numeric,
    "auditTrail" character varying,
    "dealType" character varying,
    height character varying
);


--
-- Name: leaderboard_processed_allocation_data_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.leaderboard_processed_allocation_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: leaderboard_processed_allocation_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.leaderboard_processed_allocation_data_id_seq OWNED BY public.leaderboard_processed_allocation_data.id;


--
-- Name: leaderboard_processed_data_for_verified_client; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leaderboard_processed_data_for_verified_client (
    id integer NOT NULL,
    "addressId" character varying,
    "verifierAddressId" character varying,
    "datacapRemaining" numeric,
    "daTotalDatacapReceived" numeric DEFAULT '0'::numeric,
    "ldnTotalDatacapReceived" numeric DEFAULT '0'::numeric,
    "efilTotalDatacapReceived" numeric DEFAULT '0'::numeric,
    address character varying,
    name character varying,
    "orgName" character varying,
    "latestAllowanceHeight" character varying
);


--
-- Name: leaderboard_processed_data_for_verified_client_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.leaderboard_processed_data_for_verified_client_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: leaderboard_processed_data_for_verified_client_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.leaderboard_processed_data_for_verified_client_id_seq OWNED BY public.leaderboard_processed_data_for_verified_client.id;


--
-- Name: leaderboard_processed_data_for_verifier; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leaderboard_processed_data_for_verifier (
    id integer NOT NULL,
    name character varying,
    "orgName" character varying,
    "ghHandle" character varying,
    "ghProfilePicture" character varying,
    region character varying,
    "addressId" character varying,
    address character varying,
    "daTTDTotalDuration" integer DEFAULT 0,
    "ldnTTDTotalDuration" integer DEFAULT 0,
    "efilTTDTotalDuration" integer DEFAULT 0,
    "daTTDNumberOfAllocations" integer DEFAULT 0,
    "ldnTTDNumberOfAllocations" integer DEFAULT 0,
    "efilTTDNumberOfAllocations" integer DEFAULT 0,
    "ldnPreviousProposals" integer DEFAULT 0 NOT NULL,
    "ldnPreviousApprovals" integer DEFAULT 0 NOT NULL,
    "ldnTotalNumberOfSignatures" integer DEFAULT 0 NOT NULL,
    "efilPreviousProposals" integer DEFAULT 0 NOT NULL,
    "efilPreviousApprovals" integer DEFAULT 0 NOT NULL,
    "efilTotalNumberOfSignatures" integer DEFAULT 0 NOT NULL,
    "daDatacapAllocatedToClientsInTheLast2Weeks" numeric DEFAULT '0'::numeric,
    "daDatacapAllocatedToClientsInTheLast4Weeks" numeric DEFAULT '0'::numeric,
    "daDatacapAllocatedToClientsInTheLast6Weeks" numeric DEFAULT '0'::numeric,
    "daDatacapAllocatedToClientsInTheLast8Weeks" numeric DEFAULT '0'::numeric,
    "daDatacapAllocatedToClients" numeric DEFAULT '0'::numeric,
    "ldnDatacapAllocatedToClientsInTheLast2Weeks" numeric DEFAULT '0'::numeric,
    "ldnDatacapAllocatedToClientsInTheLast4Weeks" numeric DEFAULT '0'::numeric,
    "ldnDatacapAllocatedToClientsInTheLast6Weeks" numeric DEFAULT '0'::numeric,
    "ldnDatacapAllocatedToClientsInTheLast8Weeks" numeric DEFAULT '0'::numeric,
    "ldnDatacapAllocatedToClients" numeric DEFAULT '0'::numeric,
    "efilDatacapAllocatedToClientsInTheLast2Weeks" numeric DEFAULT '0'::numeric,
    "efilDatacapAllocatedToClientsInTheLast4Weeks" numeric DEFAULT '0'::numeric,
    "efilDatacapAllocatedToClientsInTheLast6Weeks" numeric DEFAULT '0'::numeric,
    "efilDatacapAllocatedToClientsInTheLast8Weeks" numeric DEFAULT '0'::numeric,
    "efilDatacapAllocatedToClients" numeric DEFAULT '0'::numeric,
    "daNumberOfUniqueClients" integer DEFAULT 0,
    "ldnNumberOfUniqueClients" integer DEFAULT 0,
    "efilNumberOfUniqueClients" integer DEFAULT 0,
    "daDatacapAvailable" numeric DEFAULT '0'::numeric,
    "numberOfGithubDiscussions" integer DEFAULT 0 NOT NULL,
    "isMultisig" boolean DEFAULT false NOT NULL,
    "allowanceArray" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "numberOfIssuesCreated" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAtHeight" integer
);


--
-- Name: leaderboard_processed_data_for_verifier_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.leaderboard_processed_data_for_verifier_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: leaderboard_processed_data_for_verifier_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.leaderboard_processed_data_for_verifier_id_seq OWNED BY public.leaderboard_processed_data_for_verifier.id;


--
-- Name: meta_allocator; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meta_allocator (
    id integer NOT NULL,
    "addressId" character varying,
    address character varying,
    "addressEth" character varying
);


--
-- Name: meta_allocator_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.meta_allocator_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: meta_allocator_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.meta_allocator_id_seq OWNED BY public.meta_allocator.id;


--
-- Name: migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    "timestamp" bigint NOT NULL,
    name character varying NOT NULL
);


--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: miner_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.miner_info (
    id integer NOT NULL,
    "minerAddressId" character varying,
    "minDealSize" numeric,
    "maxDealSize" numeric,
    "rawPower" numeric,
    "qualityAdjPower" numeric,
    "isoCode" character varying,
    region character varying,
    "freeSpace" numeric,
    "storageDealsTotal" integer,
    "storageDealsNoPenalties" integer,
    "storageDealsAveragePrice" numeric,
    "storageDealsDataStored" numeric,
    "storageDealsSlashed" integer,
    "storageDealsTerminated" integer,
    "storageDealsFaultTerminated" integer,
    "storageDealsRecent30days" integer,
    "verifiedDealsTotalSize" numeric
);


--
-- Name: miner_info_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.miner_info_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: miner_info_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.miner_info_id_seq OWNED BY public.miner_info.id;


--
-- Name: multisig_alert; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.multisig_alert (
    id integer NOT NULL,
    "msigAddress" character varying,
    "addedSigners" character varying,
    "removedSigners" character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: multisig_alert_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.multisig_alert_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: multisig_alert_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.multisig_alert_id_seq OWNED BY public.multisig_alert.id;


--
-- Name: op_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.op_log (
    id integer NOT NULL,
    height integer,
    "opType" integer
);


--
-- Name: client_contract; Type: TABLE; SCHEMA: public; Owner: -
--

CREATE TABLE public.client_contract (
    id integer NOT NULL,
    "addressId" character varying NOT NULL,
    address character varying NOT NULL,
    "addressEth" character varying NOT NULL
);


--
-- Name: op_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.op_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: op_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.op_log_id_seq OWNED BY public.op_log.id;


--
-- Name: processed_data_for_miner; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.processed_data_for_miner (
    id integer NOT NULL,
    provider character varying,
    "noOfDeals" integer,
    "dealsTotalSize" numeric,
    "noOfClients" integer,
    "avgDealLength" numeric,
    "avgDealPrice" numeric,
    "minDealSize" numeric
);


--
-- Name: processed_data_for_miner_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.processed_data_for_miner_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: processed_data_for_miner_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.processed_data_for_miner_id_seq OWNED BY public.processed_data_for_miner.id;


--
-- Name: processed_data_for_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.processed_data_for_stats (
    id integer NOT NULL,
    key character varying NOT NULL,
    value character varying NOT NULL
);


--
-- Name: processed_data_for_stats_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.processed_data_for_stats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: processed_data_for_stats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.processed_data_for_stats_id_seq OWNED BY public.processed_data_for_stats.id;


--
-- Name: processed_data_for_verified_client; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.processed_data_for_verified_client (
    id integer NOT NULL,
    "addressId" character varying,
    address character varying,
    retries integer DEFAULT 3 NOT NULL,
    "auditTrail" character varying DEFAULT 'n/a'::character varying NOT NULL,
    name character varying,
    "initialAllowance" numeric,
    allowance numeric,
    "verifierAddressId" character varying,
    "createdAtHeight" integer,
    "issueCreateTimestamp" integer,
    "createMessageTimestamp" integer,
    "verifierName" character varying,
    "dealCount" integer,
    "providerCount" integer,
    "topProvider" character varying,
    "allowanceArray" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "receivedDatacapChange" character varying,
    "usedDatacapChange" character varying,
    "orgName" character varying
);


--
-- Name: processed_data_for_verified_client_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.processed_data_for_verified_client_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: processed_data_for_verified_client_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.processed_data_for_verified_client_id_seq OWNED BY public.processed_data_for_verified_client.id;


--
-- Name: processed_data_for_verified_client_ldn_allowances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.processed_data_for_verified_client_ldn_allowances (
    id integer NOT NULL,
    "allowanceId" integer,
    "clientAddressId" character varying,
    "clientAddress" character varying,
    "clientName" character varying,
    "verifierAddressId" character varying,
    "verifierAddress" character varying,
    "verifierName" character varying,
    "auditTrail" character varying DEFAULT 'n/a'::character varying NOT NULL,
    signers jsonb DEFAULT '{}'::jsonb NOT NULL,
    "allowanceNumber" integer NOT NULL,
    "datacapAllocated" numeric,
    height integer NOT NULL,
    "timestamp" integer,
    ttd integer
);


--
-- Name: processed_data_for_verified_client_ldn_allowances_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.processed_data_for_verified_client_ldn_allowances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: processed_data_for_verified_client_ldn_allowances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.processed_data_for_verified_client_ldn_allowances_id_seq OWNED BY public.processed_data_for_verified_client_ldn_allowances.id;


--
-- Name: processed_data_for_verifier; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.processed_data_for_verifier (
    id integer NOT NULL,
    "addressId" character varying,
    address character varying,
    "auditTrail" character varying DEFAULT 'n/a'::character varying NOT NULL,
    retries integer DEFAULT 3 NOT NULL,
    name character varying,
    removed boolean DEFAULT false NOT NULL,
    "initialAllowance" numeric,
    allowance numeric,
    inffered boolean DEFAULT false NOT NULL,
    "isMultisig" boolean DEFAULT false NOT NULL,
    "createdAtHeight" integer,
    "issueCreateTimestamp" integer,
    "createMessageTimestamp" integer,
    "verifiedClientsCount" integer,
    "allowanceArray" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "receivedDatacapChange" character varying,
    "orgName" character varying
);


--
-- Name: processed_data_for_verifier_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.processed_data_for_verifier_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: processed_data_for_verifier_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.processed_data_for_verifier_id_seq OWNED BY public.processed_data_for_verifier.id;


--
-- Name: processed_data_last14_days_ttfd; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.processed_data_last14_days_ttfd (
    id integer NOT NULL,
    "numberOfDirectVerifiedAllowances" integer DEFAULT 0 NOT NULL,
    "totalTTDForDirectVerifiedAllowances" integer DEFAULT 0 NOT NULL,
    "numberOfLDNVerifiedAllowances" integer DEFAULT 0 NOT NULL,
    "totalTTDForLDNVerifiedAllowances" integer DEFAULT 0 NOT NULL,
    "timestamp" integer NOT NULL
);


--
-- Name: processed_data_last14_days_ttfd_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.processed_data_last14_days_ttfd_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: processed_data_last14_days_ttfd_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.processed_data_last14_days_ttfd_id_seq OWNED BY public.processed_data_last14_days_ttfd.id;


--
-- Name: processed_sector_events_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.processed_sector_events_data (
    sector integer NOT NULL,
    "pieceCid" character varying NOT NULL,
    provider character varying NOT NULL,
    "pieceSize" numeric,
    height integer NOT NULL
);


--
-- Name: processed_weekly_data_for_client; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.processed_weekly_data_for_client (
    id integer NOT NULL,
    "addressId" character varying,
    "incomingDatacap" character varying DEFAULT '0'::character varying NOT NULL,
    "outgoingDatacap" character varying DEFAULT '0'::character varying NOT NULL,
    year integer NOT NULL,
    week integer NOT NULL
);


--
-- Name: processed_weekly_data_for_client_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.processed_weekly_data_for_client_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: processed_weekly_data_for_client_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.processed_weekly_data_for_client_id_seq OWNED BY public.processed_weekly_data_for_client.id;


--
-- Name: processed_weekly_data_for_miner; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.processed_weekly_data_for_miner (
    id integer NOT NULL,
    provider character varying,
    "noOfDeals" integer DEFAULT 0 NOT NULL,
    year integer NOT NULL,
    week integer NOT NULL
);


--
-- Name: processed_weekly_data_for_miner_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.processed_weekly_data_for_miner_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: processed_weekly_data_for_miner_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.processed_weekly_data_for_miner_id_seq OWNED BY public.processed_weekly_data_for_miner.id;


--
-- Name: processed_weekly_data_for_ttd; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.processed_weekly_data_for_ttd (
    id integer NOT NULL,
    "numberOfAutoVerifiedAllowances" integer DEFAULT 0 NOT NULL,
    "totalTTDForAutoVerifiedAllowances" integer DEFAULT 0 NOT NULL,
    "numberOfDirectVerifiedAllowances" integer DEFAULT 0 NOT NULL,
    "totalTTDForDirectVerifiedAllowances" integer DEFAULT 0 NOT NULL,
    "numberOfLDNVerifiedAllowances" integer DEFAULT 0 NOT NULL,
    "totalTTDForLDNVerifiedAllowances" integer DEFAULT 0 NOT NULL,
    year integer NOT NULL,
    week integer NOT NULL
);


--
-- Name: processed_weekly_data_for_ttd_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.processed_weekly_data_for_ttd_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: processed_weekly_data_for_ttd_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.processed_weekly_data_for_ttd_id_seq OWNED BY public.processed_weekly_data_for_ttd.id;


--
-- Name: retriable_block; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.retriable_block (
    id integer NOT NULL,
    height integer
);


--
-- Name: retriable_block_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.retriable_block_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: retriable_block_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.retriable_block_id_seq OWNED BY public.retriable_block.id;


--
-- Name: storage_market_message; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.storage_market_message (
    id integer NOT NULL,
    "msgCID" character varying,
    "alternateMsgCID" character varying,
    height integer,
    "from" character varying,
    "to" character varying,
    method character varying,
    message character varying,
    "decodedParameters" character varying,
    receipt character varying,
    "exitCode" integer,
    "decodedReceipt" character varying,
    processed boolean DEFAULT false NOT NULL,
    error character varying DEFAULT ''::character varying NOT NULL
);


--
-- Name: storage_market_message_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.storage_market_message_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: storage_market_message_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.storage_market_message_id_seq OWNED BY public.storage_market_message.id;


--
-- Name: temp; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.temp (
    address character varying
);


--
-- Name: temp_leaderboard_processed_data_for_verifier; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.temp_leaderboard_processed_data_for_verifier (
    id integer NOT NULL,
    name character varying,
    "orgName" character varying,
    "ghHandle" character varying,
    "ghProfilePicture" character varying,
    region character varying,
    "addressId" character varying,
    address character varying,
    "createdAtHeight" integer,
    "daTTDTotalDuration" integer DEFAULT 0,
    "ldnTTDTotalDuration" integer DEFAULT 0,
    "efilTTDTotalDuration" integer DEFAULT 0,
    "daTTDNumberOfAllocations" integer DEFAULT 0,
    "ldnTTDNumberOfAllocations" integer DEFAULT 0,
    "efilTTDNumberOfAllocations" integer DEFAULT 0,
    "ldnPreviousProposals" integer DEFAULT 0 NOT NULL,
    "ldnPreviousApprovals" integer DEFAULT 0 NOT NULL,
    "ldnTotalNumberOfSignatures" integer DEFAULT 0 NOT NULL,
    "efilPreviousProposals" integer DEFAULT 0 NOT NULL,
    "efilPreviousApprovals" integer DEFAULT 0 NOT NULL,
    "efilTotalNumberOfSignatures" integer DEFAULT 0 NOT NULL,
    "daDatacapAllocatedToClientsInTheLast2Weeks" numeric DEFAULT '0'::numeric,
    "daDatacapAllocatedToClientsInTheLast4Weeks" numeric DEFAULT '0'::numeric,
    "daDatacapAllocatedToClientsInTheLast6Weeks" numeric DEFAULT '0'::numeric,
    "daDatacapAllocatedToClientsInTheLast8Weeks" numeric DEFAULT '0'::numeric,
    "daDatacapAllocatedToClients" numeric DEFAULT '0'::numeric,
    "ldnDatacapAllocatedToClientsInTheLast2Weeks" numeric DEFAULT '0'::numeric,
    "ldnDatacapAllocatedToClientsInTheLast4Weeks" numeric DEFAULT '0'::numeric,
    "ldnDatacapAllocatedToClientsInTheLast6Weeks" numeric DEFAULT '0'::numeric,
    "ldnDatacapAllocatedToClientsInTheLast8Weeks" numeric DEFAULT '0'::numeric,
    "ldnDatacapAllocatedToClients" numeric DEFAULT '0'::numeric,
    "efilDatacapAllocatedToClientsInTheLast2Weeks" numeric DEFAULT '0'::numeric,
    "efilDatacapAllocatedToClientsInTheLast4Weeks" numeric DEFAULT '0'::numeric,
    "efilDatacapAllocatedToClientsInTheLast6Weeks" numeric DEFAULT '0'::numeric,
    "efilDatacapAllocatedToClientsInTheLast8Weeks" numeric DEFAULT '0'::numeric,
    "efilDatacapAllocatedToClients" numeric DEFAULT '0'::numeric,
    "daNumberOfUniqueClients" integer DEFAULT 0,
    "ldnNumberOfUniqueClients" integer DEFAULT 0,
    "efilNumberOfUniqueClients" integer DEFAULT 0,
    "daDatacapAvailable" numeric DEFAULT '0'::numeric,
    "numberOfGithubDiscussions" integer DEFAULT 0 NOT NULL,
    "numberOfIssuesCreated" integer DEFAULT 0 NOT NULL,
    "isMultisig" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "allowanceArray" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "ghUserIds" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "electionRound" character varying DEFAULT ''::character varying NOT NULL,
    "callsAttendedCount" integer DEFAULT 0 NOT NULL,
    "latestRoundApplicationLink" character varying DEFAULT ''::character varying NOT NULL
);


--
-- Name: tipset_key_by_height; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tipset_key_by_height (
    height integer NOT NULL,
    "tipsetKey" jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: typeorm_metadata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.typeorm_metadata (
    type character varying NOT NULL,
    database character varying,
    schema character varying,
    "table" character varying,
    name character varying,
    value text
);


--
-- Name: unified_verified_deal_old; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unified_verified_deal_old (
    id integer NOT NULL,
    type character varying,
    "clientId" character varying,
    "providerId" character varying,
    "sectorId" character varying,
    "pieceCid" character varying,
    "pieceSize" numeric,
    "termMax" numeric,
    "termMin" numeric,
    "termStart" numeric,
    "dealId" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "claimId" integer DEFAULT 0 NOT NULL,
    "slashedEpoch" numeric DEFAULT 0 NOT NULL,
    "processedSlashedEpoch" integer DEFAULT 0 NOT NULL
);


--
-- Name: unified_verified_deal_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.unified_verified_deal_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: unified_verified_deal_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.unified_verified_deal_id_seq OWNED BY public.unified_verified_deal_old.id;


--
-- Name: unified_verified_deal; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unified_verified_deal (
    id integer DEFAULT nextval('public.unified_verified_deal_id_seq'::regclass) NOT NULL,
    "dealId" integer DEFAULT 0 NOT NULL,
    "claimId" integer DEFAULT 0 NOT NULL,
    type character varying,
    "clientId" character varying,
    "providerId" character varying,
    "sectorId" character varying,
    "pieceCid" character varying,
    "pieceSize" numeric,
    "termMax" numeric,
    "termMin" numeric,
    "termStart" numeric,
    "slashedEpoch" numeric DEFAULT '0'::numeric NOT NULL,
    "processedSlashedEpoch" integer DEFAULT 0 NOT NULL,
    removed boolean DEFAULT false,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: unified_verified_deal_v2_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.unified_verified_deal_v2_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: unified_verified_deal_v2_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.unified_verified_deal_v2_id_seq OWNED BY public.unified_verified_deal.id;


--
-- Name: unified_verified_deal_v2; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unified_verified_deal_v2 (
    id integer DEFAULT nextval('public.unified_verified_deal_v2_id_seq'::regclass) NOT NULL,
    "dealId" integer DEFAULT 0 NOT NULL,
    "claimId" integer DEFAULT 0 NOT NULL,
    type character varying,
    "clientId" character varying,
    "providerId" character varying,
    "sectorId" character varying,
    "pieceCid" character varying,
    "pieceSize" numeric,
    "termMax" numeric,
    "termMin" numeric,
    "termStart" numeric,
    "slashedEpoch" numeric DEFAULT '0'::numeric NOT NULL,
    "processedSlashedEpoch" integer DEFAULT 0 NOT NULL,
    removed boolean DEFAULT false,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: unified_verified_deal_v2_id_seq1; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.unified_verified_deal_v2_id_seq1
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: unified_verified_deal_v2_id_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.unified_verified_deal_v2_id_seq1 OWNED BY public.unified_verified_deal_v2.id;


--
-- Name: unique_providers; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.unique_providers AS
 SELECT DISTINCT unified_verified_deal."providerId"
   FROM public.unified_verified_deal
  WITH NO DATA;


--
-- Name: verified_deal; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verified_deal (
    id integer NOT NULL,
    "verifiedClientAddressId" character varying,
    "dealId" integer,
    "pieceCID" character varying,
    provider character varying,
    "dealSize" numeric,
    "createdAtHeight" integer,
    state public.verified_deal_state_enum DEFAULT 'unknown'::public.verified_deal_state_enum NOT NULL,
    "verifierAddressId" character varying,
    "startEpoch" integer,
    inffered boolean DEFAULT true NOT NULL,
    "storagePricePerEpoch" numeric,
    "endEpoch" integer,
    "allowanceId" integer,
    "msgID" integer,
    "addedAtHeight" integer,
    "sectorId" character varying
);


--
-- Name: uniqueproviders; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.uniqueproviders AS
 SELECT DISTINCT verified_deal.provider
   FROM public.verified_deal
  WITH NO DATA;


--
-- Name: verif_reg_state; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verif_reg_state (
    id integer NOT NULL,
    head character varying,
    code character varying,
    state character varying,
    height integer,
    status integer DEFAULT 0,
    "errorMsg" character varying
);


--
-- Name: verif_reg_state_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.verif_reg_state_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: verif_reg_state_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.verif_reg_state_id_seq OWNED BY public.verif_reg_state.id;


--
-- Name: verified_client; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verified_client (
    id integer NOT NULL,
    "addressId" character varying,
    address character varying,
    "verifierAddressId" character varying,
    "initialAllowance" numeric,
    allowance numeric,
    "createdAtHeight" integer,
    "auditTrail" character varying DEFAULT 'n/a'::character varying NOT NULL,
    name character varying,
    "issueCreateTimestamp" integer,
    "createMessageTimestamp" integer,
    retries integer DEFAULT 3 NOT NULL,
    "orgName" character varying,
    region character varying,
    website character varying,
    industry character varying,
    "isAccount" boolean,
    "dcSource" character varying
);


--
-- Name: verified_client_allowance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verified_client_allowance (
    id integer NOT NULL,
    "addressId" character varying,
    "verifierAddressId" character varying,
    height integer,
    allowance numeric,
    "auditTrail" character varying,
    "msgCID" character varying,
    "issueCreateTimestamp" integer,
    "createMessageTimestamp" integer,
    retries integer DEFAULT 3 NOT NULL,
    error character varying DEFAULT ''::character varying NOT NULL,
    "usedAllowance" numeric DEFAULT '0'::numeric NOT NULL,
    "hasRemainingAllowance" boolean DEFAULT true NOT NULL,
    "allowanceTTD" integer,
    "isLdnAllowance" boolean DEFAULT false NOT NULL,
    "isFromAutoverifier" boolean DEFAULT false NOT NULL,
    "searchedByProposal" boolean DEFAULT false NOT NULL,
    "isEFilAllowance" boolean DEFAULT false NOT NULL,
    "issueCreator" character varying,
    "retrievalFrequency" character varying DEFAULT ''::character varying,
    "isDataPublic" character varying DEFAULT ''::character varying,
    "providerList" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "dcSource" character varying
);


--
-- Name: verified_client_allowance_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.verified_client_allowance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: verified_client_allowance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.verified_client_allowance_id_seq OWNED BY public.verified_client_allowance.id;


--
-- Name: verified_client_allowance_signer; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verified_client_allowance_signer (
    id integer NOT NULL,
    "signerAddressId" character varying,
    "signerAddress" character varying,
    "msgCID" character varying,
    "allowanceId" integer NOT NULL,
    method integer NOT NULL,
    "operationTTD" integer,
    "createMessageTimestamp" integer,
    "createMessageHeight" integer,
    "auditTrail" character varying
);


--
-- Name: verified_client_allowance_signer_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.verified_client_allowance_signer_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: verified_client_allowance_signer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.verified_client_allowance_signer_id_seq OWNED BY public.verified_client_allowance_signer.id;


--
-- Name: verified_client_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.verified_client_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: verified_client_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.verified_client_id_seq OWNED BY public.verified_client.id;


--
-- Name: verified_deal_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.verified_deal_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: verified_deal_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.verified_deal_id_seq OWNED BY public.verified_deal.id;


--
-- Name: verified_registry_message; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verified_registry_message (
    id integer NOT NULL,
    "msgCID" character varying,
    height integer,
    "from" character varying,
    "to" character varying,
    method character varying,
    message character varying,
    "decodedParameters" character varying,
    receipt character varying,
    "decodedParametersSecondary" character varying,
    "proposalId" integer,
    executed boolean DEFAULT false NOT NULL,
    processed boolean DEFAULT false NOT NULL,
    "decodedReceipt" character varying,
    "toAddressType" character varying,
    "exitCode" integer,
    error character varying DEFAULT ''::character varying NOT NULL,
    "alternateMsgCID" character varying
);


--
-- Name: verified_registry_message_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.verified_registry_message_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: verified_registry_message_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.verified_registry_message_id_seq OWNED BY public.verified_registry_message.id;


--
-- Name: verifier; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verifier (
    id integer NOT NULL,
    "addressId" character varying,
    address character varying,
    "initialAllowance" numeric,
    allowance numeric,
    "createdAtHeight" integer,
    "auditTrail" character varying DEFAULT 'n/a'::character varying NOT NULL,
    inffered boolean DEFAULT false NOT NULL,
    name character varying,
    "issueCreateTimestamp" integer,
    "createMessageTimestamp" integer,
    "isMultisig" boolean DEFAULT false NOT NULL,
    retries integer DEFAULT 3 NOT NULL,
    removed boolean DEFAULT false NOT NULL,
    "orgName" character varying,
    "addressEth" character varying,
    "isVirtual" boolean DEFAULT false NOT NULL,
    "isMetaAllocator" boolean DEFAULT false NOT NULL,
    "dcSource" character varying DEFAULT 'f080'::character varying NOT NULL
);


--
-- Name: verifier_allowance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verifier_allowance (
    id integer NOT NULL,
    "addressId" character varying,
    height integer,
    allowance numeric,
    "verifierId" integer,
    "auditTrail" character varying,
    "msgCID" character varying,
    "issueCreateTimestamp" integer,
    "createMessageTimestamp" integer,
    retries integer DEFAULT 3 NOT NULL,
    error character varying DEFAULT ''::character varying NOT NULL,
    "auditStatus" character varying,
    "isVirtual" boolean DEFAULT false NOT NULL,
    "dcSource" character varying DEFAULT 'f080'::character varying NOT NULL
);


--
-- Name: verifier_allowance_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.verifier_allowance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: verifier_allowance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.verifier_allowance_id_seq OWNED BY public.verifier_allowance.id;


--
-- Name: verifier_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.verifier_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: verifier_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.verifier_id_seq OWNED BY public.verifier.id;


--
-- Name: _migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._migrations ALTER COLUMN id SET DEFAULT nextval('public._migrations_id_seq'::regclass);


--
-- Name: address_cache id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.address_cache ALTER COLUMN id SET DEFAULT nextval('public.address_cache_id_seq'::regclass);


--
-- Name: allocator_info id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocator_info ALTER COLUMN id SET DEFAULT nextval('public.allocator_info_id_seq'::regclass);


--
-- Name: api_key id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_key ALTER COLUMN id SET DEFAULT nextval('public.api_key_id_seq'::regclass);


--
-- Name: api_key_request id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_key_request ALTER COLUMN id SET DEFAULT nextval('public.api_key_request_id_seq'::regclass);


--
-- Name: api_key_usage id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_key_usage ALTER COLUMN id SET DEFAULT nextval('public.api_key_usage_id_seq'::regclass);


--
-- Name: bot_event id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_event ALTER COLUMN id SET DEFAULT nextval('public.bot_event_id_seq'::regclass);


--
-- Name: client_uuid id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_uuid ALTER COLUMN id SET DEFAULT nextval('public.client_uuid_id_seq'::regclass);


--
-- Name: cron_running_state id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cron_running_state ALTER COLUMN id SET DEFAULT nextval('public.cron_running_state_id_seq'::regclass);


--
-- Name: dc_allocated_to_clients_grouped_by_verifiers_wow id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dc_allocated_to_clients_grouped_by_verifiers_wow ALTER COLUMN id SET DEFAULT nextval('public.dc_allocated_to_clients_grouped_by_verifiers_wow_id_seq'::regclass);


--
-- Name: dc_allocated_to_clients_total_by_week id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dc_allocated_to_clients_total_by_week ALTER COLUMN id SET DEFAULT nextval('public.dc_allocated_to_clients_total_by_week_id_seq'::regclass);


--
-- Name: dc_allocation id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dc_allocation ALTER COLUMN id SET DEFAULT nextval('public.dc_allocation_id_seq'::regclass);


--
-- Name: dc_claim id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dc_claim ALTER COLUMN id SET DEFAULT nextval('public.dc_claim_id_seq'::regclass);


--
-- Name: dc_update_events_with_dc_spend id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dc_update_events_with_dc_spend ALTER COLUMN id SET DEFAULT nextval('public.dc_update_events_with_dc_spend_id_seq'::regclass);


--
-- Name: dc_used_by_clients_wow id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dc_used_by_clients_wow ALTER COLUMN id SET DEFAULT nextval('public.dc_used_by_clients_wow_id_seq'::regclass);


--
-- Name: dc_verifier_update id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dc_verifier_update ALTER COLUMN id SET DEFAULT nextval('public.dc_verifier_update_id_seq'::regclass);


--
-- Name: event_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_log ALTER COLUMN id SET DEFAULT nextval('public.event_log_id_seq'::regclass);


--
-- Name: event_log_eth id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_log_eth ALTER COLUMN id SET DEFAULT nextval('public.event_log_eth_id_seq'::regclass);


--
-- Name: failed_decode_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failed_decode_log ALTER COLUMN id SET DEFAULT nextval('public.failed_decode_log_id_seq'::regclass);


--
-- Name: filfox_message id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.filfox_message ALTER COLUMN id SET DEFAULT nextval('public.filfox_message_id_seq'::regclass);


--
-- Name: gh_allocation_signer_info id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gh_allocation_signer_info ALTER COLUMN id SET DEFAULT nextval('public.gh_allocation_signer_info_id_seq'::regclass);


--
-- Name: gh_allocator_info id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gh_allocator_info ALTER COLUMN id SET DEFAULT nextval('public.gh_allocator_info_id_seq'::regclass);


--
-- Name: gh_data_cap_request id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gh_data_cap_request ALTER COLUMN id SET DEFAULT nextval('public.gh_data_cap_request_id_seq'::regclass);


--
-- Name: gh_datacap_allocation_request_comment id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gh_datacap_allocation_request_comment ALTER COLUMN id SET DEFAULT nextval('public.gh_datacap_allocation_request_comment_id_seq'::regclass);


--
-- Name: gh_datacap_allocation_signed_comment id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gh_datacap_allocation_signed_comment ALTER COLUMN id SET DEFAULT nextval('public.gh_datacap_allocation_signed_comment_id_seq'::regclass);


--
-- Name: gh_datacap_issue id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gh_datacap_issue ALTER COLUMN id SET DEFAULT nextval('public.gh_datacap_issue_id_seq'::regclass);


--
-- Name: gh_datacap_request_comment id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gh_datacap_request_comment ALTER COLUMN id SET DEFAULT nextval('public.gh_datacap_request_comment_id_seq'::regclass);


--
-- Name: gh_issue id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gh_issue ALTER COLUMN id SET DEFAULT nextval('public.gh_issue_id_seq'::regclass);


--
-- Name: glif_data_cap_request id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.glif_data_cap_request ALTER COLUMN id SET DEFAULT nextval('public.glif_data_cap_request_id_seq'::regclass);


--
-- Name: global_values id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_values ALTER COLUMN id SET DEFAULT nextval('public.global_values_id_seq'::regclass);


--
-- Name: historic_data id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historic_data ALTER COLUMN id SET DEFAULT nextval('public.historic_data_id_seq'::regclass);


--
-- Name: leaderboard_api_key id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leaderboard_api_key ALTER COLUMN id SET DEFAULT nextval('public.leaderboard_api_key_id_seq'::regclass);


--
-- Name: leaderboard_api_key_request id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leaderboard_api_key_request ALTER COLUMN id SET DEFAULT nextval('public.leaderboard_api_key_request_id_seq'::regclass);


--
-- Name: leaderboard_processed_allocation_data id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leaderboard_processed_allocation_data ALTER COLUMN id SET DEFAULT nextval('public.leaderboard_processed_allocation_data_id_seq'::regclass);


--
-- Name: leaderboard_processed_data_for_verified_client id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leaderboard_processed_data_for_verified_client ALTER COLUMN id SET DEFAULT nextval('public.leaderboard_processed_data_for_verified_client_id_seq'::regclass);


--
-- Name: leaderboard_processed_data_for_verifier id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leaderboard_processed_data_for_verifier ALTER COLUMN id SET DEFAULT nextval('public.leaderboard_processed_data_for_verifier_id_seq'::regclass);


--
-- Name: meta_allocator id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meta_allocator ALTER COLUMN id SET DEFAULT nextval('public.meta_allocator_id_seq'::regclass);


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: miner_info id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.miner_info ALTER COLUMN id SET DEFAULT nextval('public.miner_info_id_seq'::regclass);


--
-- Name: multisig_alert id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.multisig_alert ALTER COLUMN id SET DEFAULT nextval('public.multisig_alert_id_seq'::regclass);


--
-- Name: op_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.op_log ALTER COLUMN id SET DEFAULT nextval('public.op_log_id_seq'::regclass);


--
-- Name: processed_data_for_miner id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processed_data_for_miner ALTER COLUMN id SET DEFAULT nextval('public.processed_data_for_miner_id_seq'::regclass);


--
-- Name: processed_data_for_stats id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processed_data_for_stats ALTER COLUMN id SET DEFAULT nextval('public.processed_data_for_stats_id_seq'::regclass);


--
-- Name: processed_data_for_verified_client id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processed_data_for_verified_client ALTER COLUMN id SET DEFAULT nextval('public.processed_data_for_verified_client_id_seq'::regclass);


--
-- Name: processed_data_for_verified_client_ldn_allowances id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processed_data_for_verified_client_ldn_allowances ALTER COLUMN id SET DEFAULT nextval('public.processed_data_for_verified_client_ldn_allowances_id_seq'::regclass);


--
-- Name: processed_data_for_verifier id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processed_data_for_verifier ALTER COLUMN id SET DEFAULT nextval('public.processed_data_for_verifier_id_seq'::regclass);


--
-- Name: processed_data_last14_days_ttfd id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processed_data_last14_days_ttfd ALTER COLUMN id SET DEFAULT nextval('public.processed_data_last14_days_ttfd_id_seq'::regclass);


--
-- Name: processed_weekly_data_for_client id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processed_weekly_data_for_client ALTER COLUMN id SET DEFAULT nextval('public.processed_weekly_data_for_client_id_seq'::regclass);


--
-- Name: processed_weekly_data_for_miner id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processed_weekly_data_for_miner ALTER COLUMN id SET DEFAULT nextval('public.processed_weekly_data_for_miner_id_seq'::regclass);


--
-- Name: processed_weekly_data_for_ttd id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processed_weekly_data_for_ttd ALTER COLUMN id SET DEFAULT nextval('public.processed_weekly_data_for_ttd_id_seq'::regclass);


--
-- Name: retriable_block id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.retriable_block ALTER COLUMN id SET DEFAULT nextval('public.retriable_block_id_seq'::regclass);


--
-- Name: storage_market_message id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage_market_message ALTER COLUMN id SET DEFAULT nextval('public.storage_market_message_id_seq'::regclass);


--
-- Name: unified_verified_deal_old id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unified_verified_deal_old ALTER COLUMN id SET DEFAULT nextval('public.unified_verified_deal_id_seq'::regclass);


--
-- Name: verif_reg_state id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verif_reg_state ALTER COLUMN id SET DEFAULT nextval('public.verif_reg_state_id_seq'::regclass);


--
-- Name: verified_client id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verified_client ALTER COLUMN id SET DEFAULT nextval('public.verified_client_id_seq'::regclass);


--
-- Name: verified_client_allowance id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verified_client_allowance ALTER COLUMN id SET DEFAULT nextval('public.verified_client_allowance_id_seq'::regclass);


--
-- Name: verified_client_allowance_signer id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verified_client_allowance_signer ALTER COLUMN id SET DEFAULT nextval('public.verified_client_allowance_signer_id_seq'::regclass);


--
-- Name: verified_deal id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verified_deal ALTER COLUMN id SET DEFAULT nextval('public.verified_deal_id_seq'::regclass);


--
-- Name: verified_registry_message id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verified_registry_message ALTER COLUMN id SET DEFAULT nextval('public.verified_registry_message_id_seq'::regclass);


--
-- Name: verifier id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verifier ALTER COLUMN id SET DEFAULT nextval('public.verifier_id_seq'::regclass);


--
-- Name: verifier_allowance id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verifier_allowance ALTER COLUMN id SET DEFAULT nextval('public.verifier_allowance_id_seq'::regclass);


--
-- Name: gh_datacap_allocation_signed_comment PK_02bfe05f90851fa4c6eba21a0e3; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gh_datacap_allocation_signed_comment
    ADD CONSTRAINT "PK_02bfe05f90851fa4c6eba21a0e3" PRIMARY KEY (id);


--
-- Name: gh_datacap_request_comment PK_0790021a53cdce98fb0a5ba53dd; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gh_datacap_request_comment
    ADD CONSTRAINT "PK_0790021a53cdce98fb0a5ba53dd" PRIMARY KEY (id);


--
-- Name: dc_used_by_clients_wow PK_0df800e66ff014a1a82e879deb8; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dc_used_by_clients_wow
    ADD CONSTRAINT "PK_0df800e66ff014a1a82e879deb8" PRIMARY KEY (id);


--
-- Name: processed_data_for_miner PK_13f712285ddfec79e5206bc9627; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processed_data_for_miner
    ADD CONSTRAINT "PK_13f712285ddfec79e5206bc9627" PRIMARY KEY (id);


--
-- Name: dc_allocation_messages PK_15e99bf2c440c6cecdbfb078163; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dc_allocation_messages
    ADD CONSTRAINT "PK_15e99bf2c440c6cecdbfb078163" PRIMARY KEY ("msgCid");


--
-- Name: leaderboard_processed_data_for_verifier PK_1649f50164ad20a466a932a1afe; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leaderboard_processed_data_for_verifier
    ADD CONSTRAINT "PK_1649f50164ad20a466a932a1afe" PRIMARY KEY (id);


--
-- Name: leaderboard_api_key_request PK_17cc840678aec9ca90fdefd7869; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leaderboard_api_key_request
    ADD CONSTRAINT "PK_17cc840678aec9ca90fdefd7869" PRIMARY KEY (id);


--
-- Name: multisig_alert PK_1a259f12720be6f7106b425a8ae; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.multisig_alert
    ADD CONSTRAINT "PK_1a259f12720be6f7106b425a8ae" PRIMARY KEY (id);


--
-- Name: api_key_usage PK_1dfaaf6fd004e3fe39e513b58f2; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_key_usage
    ADD CONSTRAINT "PK_1dfaaf6fd004e3fe39e513b58f2" PRIMARY KEY (id);


--
-- Name: dc_verifier_update PK_20c9861bd150a84260ccba8a34d; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dc_verifier_update
    ADD CONSTRAINT "PK_20c9861bd150a84260ccba8a34d" PRIMARY KEY (id);


--
-- Name: allocator_info PK_23545a4260d449ddbafd796a9da; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocator_info
    ADD CONSTRAINT "PK_23545a4260d449ddbafd796a9da" PRIMARY KEY (id);


--
-- Name: processed_data_for_verified_client PK_29708920748f7576c29072083cf; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processed_data_for_verified_client
    ADD CONSTRAINT "PK_29708920748f7576c29072083cf" PRIMARY KEY (id);


--
-- Name: meta_allocator PK_2fd87feb63af6359c425071c149; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meta_allocator
    ADD CONSTRAINT "PK_2fd87feb63af6359c425071c149" PRIMARY KEY (id);


--
-- Name: failed_decode_log PK_3b3d0f842198fd26027957e88a6; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failed_decode_log
    ADD CONSTRAINT "PK_3b3d0f842198fd26027957e88a6" PRIMARY KEY (id);


--
-- Name: backfill_ranges PK_3f0643c2310b4c9873a9040cfc1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backfill_ranges
    ADD CONSTRAINT "PK_3f0643c2310b4c9873a9040cfc1" PRIMARY KEY ("hashId");


--
-- Name: dc_claim PK_3fba7f73baf06e9c751117c3ba6; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dc_claim
    ADD CONSTRAINT "PK_3fba7f73baf06e9c751117c3ba6" PRIMARY KEY (id);


--
-- Name: bot_event PK_4791f5ac719725923355b53c6ab; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_event
    ADD CONSTRAINT "PK_4791f5ac719725923355b53c6ab" PRIMARY KEY (id);


--
-- Name: processed_data_for_stats PK_486224ca7c45e55d529a24c4c19; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processed_data_for_stats
    ADD CONSTRAINT "PK_486224ca7c45e55d529a24c4c19" PRIMARY KEY (id);


--
-- Name: api_key_request PK_4a9d639027a6e62439ee697dcc2; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_key_request
    ADD CONSTRAINT "PK_4a9d639027a6e62439ee697dcc2" PRIMARY KEY (id);


--
-- Name: gh_issue PK_4eee22f9f051487c1d3737ef21c; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gh_issue
    ADD CONSTRAINT "PK_4eee22f9f051487c1d3737ef21c" PRIMARY KEY (id);


--
-- Name: processed_data_for_verifier PK_51525890b072ad0fcd275bc1904; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processed_data_for_verifier
    ADD CONSTRAINT "PK_51525890b072ad0fcd275bc1904" PRIMARY KEY (id);


--
-- Name: _migrations PK_52c0aa36ad15cc87e5bab334659; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._migrations
    ADD CONSTRAINT "PK_52c0aa36ad15cc87e5bab334659" PRIMARY KEY (id);


--
-- Name: dc_allocated_to_clients_grouped_by_verifiers_wow PK_54eb8a45a66093ae0499009d53b; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dc_allocated_to_clients_grouped_by_verifiers_wow
    ADD CONSTRAINT "PK_54eb8a45a66093ae0499009d53b" PRIMARY KEY (id);


--
-- Name: processed_weekly_data_for_miner PK_55bb4e9cd46e2a411c8045567e3; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processed_weekly_data_for_miner
    ADD CONSTRAINT "PK_55bb4e9cd46e2a411c8045567e3" PRIMARY KEY (id);


--
-- Name: dc_allocation_claim PK_56bda14d434729996b2195143ff; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dc_allocation_claim
    ADD CONSTRAINT "PK_56bda14d434729996b2195143ff" PRIMARY KEY (id);


--
-- Name: gh_allocator_info PK_57cc3700681c6adf4059eaf7c05; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gh_allocator_info
    ADD CONSTRAINT "PK_57cc3700681c6adf4059eaf7c05" PRIMARY KEY (id);


--
-- Name: gh_datacap_allocation_request_comment PK_61819a35123c2a949a0418f7884; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gh_datacap_allocation_request_comment
    ADD CONSTRAINT "PK_61819a35123c2a949a0418f7884" PRIMARY KEY (id);


--
-- Name: retriable_block PK_63cb81fcf882e6c3b07429cc2fb; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.retriable_block
    ADD CONSTRAINT "PK_63cb81fcf882e6c3b07429cc2fb" PRIMARY KEY (id);


--
-- Name: gh_data_cap_request PK_66414562324dc76d6fee91a0172; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gh_data_cap_request
    ADD CONSTRAINT "PK_66414562324dc76d6fee91a0172" PRIMARY KEY (id);


--
-- Name: gh_allocation_info PK_6a7d1f28395e38ce8c4b4938142; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gh_allocation_info
    ADD CONSTRAINT "PK_6a7d1f28395e38ce8c4b4938142" PRIMARY KEY (id);


--
-- Name: global_values PK_6b2a646fc5634e9be5a70f84365; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_values
    ADD CONSTRAINT "PK_6b2a646fc5634e9be5a70f84365" PRIMARY KEY (id);


--
-- Name: address_cache PK_7086b0337382332f7754417881e; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.address_cache
    ADD CONSTRAINT "PK_7086b0337382332f7754417881e" PRIMARY KEY (id);


--
-- Name: verified_client_allowance_signer PK_711d4ac6ccc44acc5d2ac1c97c3; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verified_client_allowance_signer
    ADD CONSTRAINT "PK_711d4ac6ccc44acc5d2ac1c97c3" PRIMARY KEY (id);


--
-- Name: unified_verified_deal_old PK_76f56333d366aa67ac747861bde; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unified_verified_deal_old
    ADD CONSTRAINT "PK_76f56333d366aa67ac747861bde" PRIMARY KEY (id);


--
-- Name: filfox_message PK_77f4a58512c9647266aebd43847; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.filfox_message
    ADD CONSTRAINT "PK_77f4a58512c9647266aebd43847" PRIMARY KEY (id);


--
-- Name: gh_allocation_signer_info PK_7d2ed241c7087cc376e89cfe49c; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gh_allocation_signer_info
    ADD CONSTRAINT "PK_7d2ed241c7087cc376e89cfe49c" PRIMARY KEY (id);


--
-- Name: cron_running_state PK_7e8db3b75b09b220991bb1183e9; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cron_running_state
    ADD CONSTRAINT "PK_7e8db3b75b09b220991bb1183e9" PRIMARY KEY (id);


--
-- Name: processed_sector_events_data PK_7fca81f5567b0f4ead92d193920; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processed_sector_events_data
    ADD CONSTRAINT "PK_7fca81f5567b0f4ead92d193920" PRIMARY KEY (sector, "pieceCid", provider);


--
-- Name: verified_deal PK_8406445db38f14b4c99f12807dc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verified_deal
    ADD CONSTRAINT "PK_8406445db38f14b4c99f12807dc" PRIMARY KEY (id);


--
-- Name: leaderboard_processed_data_for_verified_client PK_870824d075c7d2b6f3beae07096; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leaderboard_processed_data_for_verified_client
    ADD CONSTRAINT "PK_870824d075c7d2b6f3beae07096" PRIMARY KEY (id);


--
-- Name: migrations PK_8c82d7f526340ab734260ea46be; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY (id);


--
-- Name: processed_weekly_data_for_client PK_8d421dbd2570ec3db524fed4c61; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processed_weekly_data_for_client
    ADD CONSTRAINT "PK_8d421dbd2570ec3db524fed4c61" PRIMARY KEY (id);


--
-- Name: verified_client PK_97bc5b5b91a0e57c62bf9ea956d; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verified_client
    ADD CONSTRAINT "PK_97bc5b5b91a0e57c62bf9ea956d" PRIMARY KEY (id);


--
-- Name: storage_market_message PK_9eda45828e19f76029152ce2349; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage_market_message
    ADD CONSTRAINT "PK_9eda45828e19f76029152ce2349" PRIMARY KEY (id);


--
-- Name: verified_registry_message PK_a17807eaa54de7dd09def5febd4; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verified_registry_message
    ADD CONSTRAINT "PK_a17807eaa54de7dd09def5febd4" PRIMARY KEY (id);


--
-- Name: verified_client_allowance PK_ab34ec6cc64a603d6d37ad80837; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verified_client_allowance
    ADD CONSTRAINT "PK_ab34ec6cc64a603d6d37ad80837" PRIMARY KEY (id);


--
-- Name: leaderboard_api_key PK_aeb78a7b07650798a9df3614151; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leaderboard_api_key
    ADD CONSTRAINT "PK_aeb78a7b07650798a9df3614151" PRIMARY KEY (id);


--
-- Name: processed_weekly_data_for_ttd PK_b0e84822032b76c2a16b5896a19; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processed_weekly_data_for_ttd
    ADD CONSTRAINT "PK_b0e84822032b76c2a16b5896a19" PRIMARY KEY (id);


--
-- Name: api_key PK_b1bd840641b8acbaad89c3d8d11; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_key
    ADD CONSTRAINT "PK_b1bd840641b8acbaad89c3d8d11" PRIMARY KEY (id);


--
-- Name: dc_allocation PK_b1e7f6876cac1591e2cc354dc6c; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dc_allocation
    ADD CONSTRAINT "PK_b1e7f6876cac1591e2cc354dc6c" PRIMARY KEY (id);


--
-- Name: verifier PK_b72ba840a5a8301e0a686fba6b0; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verifier
    ADD CONSTRAINT "PK_b72ba840a5a8301e0a686fba6b0" PRIMARY KEY (id);


--
-- Name: verifier_allowance PK_c04e5ae813349d195e9208e5877; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verifier_allowance
    ADD CONSTRAINT "PK_c04e5ae813349d195e9208e5877" PRIMARY KEY (id);


--
-- Name: unified_verified_deal_v2 PK_c30ce3830f1633bb255aeaab0f8; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unified_verified_deal_v2
    ADD CONSTRAINT "PK_c30ce3830f1633bb255aeaab0f8" PRIMARY KEY (id);


--
-- Name: unified_verified_deal PK_c30ce3830f1633bb255aeaab0f8_v2; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unified_verified_deal
    ADD CONSTRAINT "PK_c30ce3830f1633bb255aeaab0f8_v2" PRIMARY KEY (id);


--
-- Name: glif_data_cap_request PK_c6f5bea80fde0f77588424b10b3; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.glif_data_cap_request
    ADD CONSTRAINT "PK_c6f5bea80fde0f77588424b10b3" PRIMARY KEY (id);


--
-- Name: leaderboard_processed_allocation_data PK_c8124f6929ed9b5051203df0b29; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leaderboard_processed_allocation_data
    ADD CONSTRAINT "PK_c8124f6929ed9b5051203df0b29" PRIMARY KEY (id);


--
-- Name: processed_data_last14_days_ttfd PK_d30ec83245c1189d6c25a64b8de; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processed_data_last14_days_ttfd
    ADD CONSTRAINT "PK_d30ec83245c1189d6c25a64b8de" PRIMARY KEY (id);


--
-- Name: gh_client_info PK_d46fc268761b6ed0faadc09c444; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gh_client_info
    ADD CONSTRAINT "PK_d46fc268761b6ed0faadc09c444" PRIMARY KEY (id);


--
-- Name: event_log PK_d8ccd9b5b44828ea378dd37e691; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_log
    ADD CONSTRAINT "PK_d8ccd9b5b44828ea378dd37e691" PRIMARY KEY (id);


--
-- Name: dc_update_events_with_dc_spend PK_da940502bff1995498abae2dcf3; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dc_update_events_with_dc_spend
    ADD CONSTRAINT "PK_da940502bff1995498abae2dcf3" PRIMARY KEY (id);


--
-- Name: dc_allocated_to_clients_total_by_week PK_dbb1c2b1e809c2c583c3e5a23ad; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dc_allocated_to_clients_total_by_week
    ADD CONSTRAINT "PK_dbb1c2b1e809c2c583c3e5a23ad" PRIMARY KEY (id);


--
-- Name: tipset_key_by_height PK_e329a22a83e3a58c50cef1faf73; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipset_key_by_height
    ADD CONSTRAINT "PK_e329a22a83e3a58c50cef1faf73" PRIMARY KEY (height);


--
-- Name: op_log PK_e51bf25e905efa6a464a3b968eb; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.op_log
    ADD CONSTRAINT "PK_e51bf25e905efa6a464a3b968eb" PRIMARY KEY (id);


--
-- Name: event_log_eth PK_e7f950437147df317c80b34525e; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_log_eth
    ADD CONSTRAINT "PK_e7f950437147df317c80b34525e" PRIMARY KEY (id);


--
-- Name: historic_data PK_e811256d066ea8c508c3587641e; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historic_data
    ADD CONSTRAINT "PK_e811256d066ea8c508c3587641e" PRIMARY KEY (id);


--
-- Name: dc_update_messages PK_ebf348911c44183b48ef78922dc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dc_update_messages
    ADD CONSTRAINT "PK_ebf348911c44183b48ef78922dc" PRIMARY KEY ("msgCid");


--
-- Name: client_uuid PK_ee8b8cca46a6991127e0f7cf301; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_uuid
    ADD CONSTRAINT "PK_ee8b8cca46a6991127e0f7cf301" PRIMARY KEY (id);


--
-- Name: processed_data_for_verified_client_ldn_allowances PK_ef67857436233d0200fdd456f56; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processed_data_for_verified_client_ldn_allowances
    ADD CONSTRAINT "PK_ef67857436233d0200fdd456f56" PRIMARY KEY (id);


--
-- Name: verif_reg_state PK_f50d0ef0994940eeb9eef64466e; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verif_reg_state
    ADD CONSTRAINT "PK_f50d0ef0994940eeb9eef64466e" PRIMARY KEY (id);


--
-- Name: miner_info PK_fd882ecd019dd341d7072ea7b34; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.miner_info
    ADD CONSTRAINT "PK_fd882ecd019dd341d7072ea7b34" PRIMARY KEY (id);


--
-- Name: gh_datacap_issue PK_ff94ef3049d7ad9bbde0cae77d3; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gh_datacap_issue
    ADD CONSTRAINT "PK_ff94ef3049d7ad9bbde0cae77d3" PRIMARY KEY (id);


--
-- Name: leaderboard_processed_data_for_verifier UQ_14663b8487c3b6ab8290bf7fd65; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leaderboard_processed_data_for_verifier
    ADD CONSTRAINT "UQ_14663b8487c3b6ab8290bf7fd65" UNIQUE ("addressId");


--
-- Name: retriable_block UQ_2f1cdaa8fecb05c129d16fd671f; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.retriable_block
    ADD CONSTRAINT "UQ_2f1cdaa8fecb05c129d16fd671f" UNIQUE (height);


--
-- Name: leaderboard_api_key UQ_32639d89ed887a159e64ad0826b; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leaderboard_api_key
    ADD CONSTRAINT "UQ_32639d89ed887a159e64ad0826b" UNIQUE ("githubId");


--
-- Name: api_key UQ_384628c976a3af0cf44c3621382; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_key
    ADD CONSTRAINT "UQ_384628c976a3af0cf44c3621382" UNIQUE ("githubId");


--
-- Name: client_uuid UQ_4ba3a4e838f69b9ba5ec807d8fb; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_uuid
    ADD CONSTRAINT "UQ_4ba3a4e838f69b9ba5ec807d8fb" UNIQUE ("ghLogin");


--
-- Name: processed_data_for_verifier UQ_72157ee4f75e6a229c1b56fbd0d; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processed_data_for_verifier
    ADD CONSTRAINT "UQ_72157ee4f75e6a229c1b56fbd0d" UNIQUE ("addressId");


--
-- Name: processed_data_for_verified_client_ldn_allowances UQ_87652bfb546371d004974d348d2; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processed_data_for_verified_client_ldn_allowances
    ADD CONSTRAINT "UQ_87652bfb546371d004974d348d2" UNIQUE ("allowanceId");


--
-- Name: meta_allocator UQ_8f58133d0d2c5060a795e9c099b; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meta_allocator
    ADD CONSTRAINT "UQ_8f58133d0d2c5060a795e9c099b" UNIQUE ("addressId");


--
-- Name: op_log UQ_a79debfbf137b497520cc64d3f4; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.op_log
    ADD CONSTRAINT "UQ_a79debfbf137b497520cc64d3f4" UNIQUE (height);


--
-- Name: verifier UQ_bb51fdfa37c5db063577ccdbfdd; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verifier
    ADD CONSTRAINT "UQ_bb51fdfa37c5db063577ccdbfdd" UNIQUE ("addressId");


--
-- Name: client_uuid UQ_d7e11ff89141fb62b9e2660706f; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_uuid
    ADD CONSTRAINT "UQ_d7e11ff89141fb62b9e2660706f" UNIQUE ("ghId");


--
-- Name: api_key_request UQ_e942bf3926406b9d64290946156; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_key_request
    ADD CONSTRAINT "UQ_e942bf3926406b9d64290946156" UNIQUE ("githubId");


--
-- Name: glif_data_cap_request UQ_eb765abcbf86c289c0a86720253; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.glif_data_cap_request
    ADD CONSTRAINT "UQ_eb765abcbf86c289c0a86720253" UNIQUE ("messageId");


--
-- Name: leaderboard_api_key_request UQ_eb7bcafb0d6af0b3ab9534d16de; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leaderboard_api_key_request
    ADD CONSTRAINT "UQ_eb7bcafb0d6af0b3ab9534d16de" UNIQUE ("githubId");


--
-- Name: gh_data_cap_request uniqueIssueId; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gh_data_cap_request
    ADD CONSTRAINT "uniqueIssueId" UNIQUE ("issueId");


--
-- Name: gh_data_cap_request uniqueMessageId; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gh_data_cap_request
    ADD CONSTRAINT "uniqueMessageId" UNIQUE ("messageId");


--
-- Name: processed_data_for_verified_client uniqueProcessedDataVerifiedClient; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processed_data_for_verified_client
    ADD CONSTRAINT "uniqueProcessedDataVerifiedClient" UNIQUE ("addressId", "verifierAddressId");


--
-- Name: verified_client uniqueVerifiedClient; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verified_client
    ADD CONSTRAINT "uniqueVerifiedClient" UNIQUE ("addressId", "verifierAddressId");


--
-- Name: IDX_6bd12a25b5f74dfccc76300dcb; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_6bd12a25b5f74dfccc76300dcb" ON public.address_cache USING btree ("addressId");


--
-- Name: IDX_deal_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_deal_id" ON public.verified_deal USING btree ("dealId");


--
-- Name: IDX_e9ada8c47739d7a22f6aaaa999; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_e9ada8c47739d7a22f6aaaa999" ON public.address_cache USING btree (address);


--
-- Name: IDX_verified_client_address_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_verified_client_address_id" ON public.verified_deal USING btree ("verifiedClientAddressId", "createdAtHeight" DESC);


--
-- Name: IDX_verified_deal_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_verified_deal_provider" ON public.verified_deal USING btree (provider);


--
-- Name: dc_allocation_claim_clientid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX dc_allocation_claim_clientid_index ON public.dc_allocation_claim USING btree ("clientId");


--
-- Name: dc_allocation_claim_clientid_sectorid_piececid_providerid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX dc_allocation_claim_clientid_sectorid_piececid_providerid_index ON public.dc_allocation_claim USING btree ("clientId", "sectorId", "pieceCid", "providerId");


--
-- Name: event_UNIQUE; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "event_UNIQUE" ON public.event_log_eth USING btree ("blockNumber", "transactionIndex", "logIndex");


--
-- Name: event_log_allocationclaimid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_log_allocationclaimid_index ON public.event_log USING btree ("allocationClaimId");


--
-- Name: event_log_hashid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_log_hashid_index ON public.event_log USING btree ("hashId");


--
-- Name: event_log_height_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_log_height_index ON public.event_log USING btree (height);


--
-- Name: event_log_msgcid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_log_msgcid_index ON public.event_log USING btree ("msgCid");


--
-- Name: hashId_UNIQUE; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "hashId_UNIQUE" ON public.dc_verifier_update USING btree ("hashId");


--
-- Name: unified_verified_deal_claimid_conditional_uindex_old; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX unified_verified_deal_claimid_conditional_uindex_old ON public.unified_verified_deal_old USING btree ("claimId") WHERE ((type)::text <> 'deal'::text);


--
-- Name: unified_verified_deal_claimid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX unified_verified_deal_claimid_index ON public.unified_verified_deal USING btree ("claimId");


--
-- Name: unified_verified_deal_clientid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX unified_verified_deal_clientid_index ON public.unified_verified_deal USING btree ("clientId");


--
-- Name: unified_verified_deal_clientid_index_old; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX unified_verified_deal_clientid_index_old ON public.unified_verified_deal_old USING btree ("clientId");


--
-- Name: unified_verified_deal_dealid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX unified_verified_deal_dealid_index ON public.unified_verified_deal USING btree ("dealId");


--
-- Name: unified_verified_deal_dealid_index_old; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX unified_verified_deal_dealid_index_old ON public.unified_verified_deal_old USING btree ("dealId");


--
-- Name: unified_verified_deal_piececid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX unified_verified_deal_piececid_index ON public.unified_verified_deal USING btree ("pieceCid");


--
-- Name: unified_verified_deal_providerid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX unified_verified_deal_providerid_index ON public.unified_verified_deal USING btree ("providerId");


--
-- Name: unified_verified_deal_providerid_index_old; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX unified_verified_deal_providerid_index_old ON public.unified_verified_deal_old USING btree ("providerId");


--
-- Name: unified_verified_deal_sectorid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX unified_verified_deal_sectorid_index ON public.unified_verified_deal USING btree ("sectorId");


--
-- Name: unified_verified_deal_v2_claimid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX unified_verified_deal_v2_claimid_index ON public.unified_verified_deal_v2 USING btree ("claimId");


--
-- Name: unified_verified_deal_v2_clientid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX unified_verified_deal_v2_clientid_index ON public.unified_verified_deal_v2 USING btree ("clientId");


--
-- Name: unified_verified_deal_v2_dealid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX unified_verified_deal_v2_dealid_index ON public.unified_verified_deal_v2 USING btree ("dealId");


--
-- Name: unified_verified_deal_v2_piececid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX unified_verified_deal_v2_piececid_index ON public.unified_verified_deal_v2 USING btree ("pieceCid");


--
-- Name: unified_verified_deal_v2_providerid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX unified_verified_deal_v2_providerid_index ON public.unified_verified_deal_v2 USING btree ("providerId");


--
-- Name: unified_verified_deal_v2_sectorid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX unified_verified_deal_v2_sectorid_index ON public.unified_verified_deal_v2 USING btree ("sectorId");


--
-- Name: unique_msgCid_claimId; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "unique_msgCid_claimId" ON public.dc_update_events_with_dc_spend USING btree ("msgCid", "claimId");


--
-- Name: gh_datacap_allocation_request_comment FK_3d7136e56b74e8c2a19c5a7d8c6; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gh_datacap_allocation_request_comment
    ADD CONSTRAINT "FK_3d7136e56b74e8c2a19c5a7d8c6" FOREIGN KEY ("issueId") REFERENCES public.gh_datacap_issue(id);


--
-- Name: gh_datacap_request_comment FK_98bc6befbc6f383cdf85e58061e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gh_datacap_request_comment
    ADD CONSTRAINT "FK_98bc6befbc6f383cdf85e58061e" FOREIGN KEY ("issueId") REFERENCES public.gh_datacap_issue(id);


--
-- Name: gh_datacap_allocation_signed_comment FK_e5c0ffb67ed4487e8d5fee5ce0d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gh_datacap_allocation_signed_comment
    ADD CONSTRAINT "FK_e5c0ffb67ed4487e8d5fee5ce0d" FOREIGN KEY ("issueId") REFERENCES public.gh_datacap_issue(id);


--
-- PostgreSQL database dump complete
--

