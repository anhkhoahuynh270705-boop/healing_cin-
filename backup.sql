--
-- PostgreSQL database dump
--

\restrict 8aaLUqbzZRsRWbfTm2OStmFAlFqfQ9uF1C6eOn2cfmi7vgKA480Rj8JTpSCk9P0

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_accounts (
    id character varying(36) NOT NULL,
    username character varying(32) NOT NULL,
    password_salt character varying(64) NOT NULL,
    password_hash character varying(64) NOT NULL,
    created_at bigint NOT NULL
);


--
-- Name: admin_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_sessions (
    token_hash character varying(64) NOT NULL,
    expires_at bigint NOT NULL,
    revoked_at bigint
);


--
-- Name: cinema_rooms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cinema_rooms (
    id character varying(80) NOT NULL,
    name character varying(80) NOT NULL,
    playback_video_id character varying(32) NOT NULL,
    playback_title character varying(200) NOT NULL,
    playback_source character varying(16) NOT NULL,
    playback_position double precision NOT NULL,
    playback_playing boolean NOT NULL,
    playback_updated_at bigint NOT NULL,
    lofi_index integer NOT NULL,
    host_id character varying(100),
    playback_duration_seconds integer DEFAULT 0 NOT NULL
);


--
-- Name: cinema_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cinema_users (
    id character varying(36) NOT NULL,
    username character varying(24) NOT NULL,
    password_salt character varying(64) NOT NULL,
    password_hash character varying(64) NOT NULL,
    display_name character varying(40) NOT NULL,
    avatar character varying(32) NOT NULL,
    shirt_color_index integer NOT NULL,
    accessory_index integer NOT NULL,
    hair_color_index integer NOT NULL,
    vip_tier integer NOT NULL,
    created_at bigint NOT NULL,
    donation_transfer_code character varying(40) NOT NULL,
    donation_total_confirmed bigint DEFAULT 0 NOT NULL,
    donation_usable_balance bigint DEFAULT 0 NOT NULL,
    experience_points bigint DEFAULT 0 NOT NULL
);


--
-- Name: flyway_schema_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flyway_schema_history (
    installed_rank integer NOT NULL,
    version character varying(50),
    description character varying(200) NOT NULL,
    type character varying(20) NOT NULL,
    script character varying(1000) NOT NULL,
    checksum integer,
    installed_by character varying(100) NOT NULL,
    installed_on timestamp without time zone DEFAULT now() NOT NULL,
    execution_time integer NOT NULL,
    success boolean NOT NULL
);


--
-- Name: payment_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_requests (
    id character varying(36) NOT NULL,
    user_id character varying(36) NOT NULL,
    username character varying(24) NOT NULL,
    tier integer NOT NULL,
    amount integer NOT NULL,
    memo character varying(200) NOT NULL,
    status character varying(16) NOT NULL,
    created_at bigint NOT NULL,
    request_type character varying(20) NOT NULL,
    room_code character varying(48),
    room_name character varying(40),
    room_lofi_index integer DEFAULT 0 NOT NULL
);


--
-- Name: personal_media_uploads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.personal_media_uploads (
    id character varying(32) NOT NULL,
    room_id character varying(80) NOT NULL,
    environment character varying(20) NOT NULL,
    uploaded_by character varying(36) NOT NULL,
    original_name character varying(160) NOT NULL,
    content_type character varying(80) NOT NULL,
    storage_name character varying(48) NOT NULL,
    duration_seconds integer NOT NULL,
    charged_amount bigint NOT NULL,
    uploaded_at bigint NOT NULL,
    CONSTRAINT personal_media_uploads_charged_amount_check CHECK (((charged_amount >= 5000) AND (charged_amount <= 50000))),
    CONSTRAINT personal_media_uploads_duration_seconds_check CHECK (((duration_seconds >= 1) AND (duration_seconds <= 10)))
);


--
-- Name: room_chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.room_chat_messages (
    id character varying(36) NOT NULL,
    room_id character varying(80) NOT NULL,
    sender_id character varying(100) NOT NULL,
    sender_name character varying(24) NOT NULL,
    sender_avatar character varying(32) NOT NULL,
    message_text character varying(400) NOT NULL,
    message_time bigint NOT NULL,
    vip_tier integer NOT NULL
);


--
-- Name: room_guests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.room_guests (
    id character varying(100) NOT NULL,
    room_id character varying(80) NOT NULL,
    client_id character varying(64),
    user_id character varying(36),
    name character varying(24) NOT NULL,
    avatar character varying(32) NOT NULL,
    x double precision NOT NULL,
    y double precision NOT NULL,
    face integer NOT NULL,
    seat integer,
    shirt_color_index integer NOT NULL,
    accessory_index integer NOT NULL,
    hair_color_index integer NOT NULL,
    vip_tier integer NOT NULL,
    last_move_at bigint NOT NULL,
    joined_at bigint NOT NULL,
    gender character varying(8) DEFAULT 'male'::character varying NOT NULL,
    shirt_color character varying(32) DEFAULT '#9FADD9'::character varying NOT NULL,
    shirt_tier integer DEFAULT 0 NOT NULL,
    action character varying(16) DEFAULT 'idle'::character varying NOT NULL,
    dance_action character varying(50) NOT NULL
);


--
-- Name: room_queue_videos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.room_queue_videos (
    id character varying(36) NOT NULL,
    room_id character varying(80) NOT NULL,
    video_id character varying(11) NOT NULL,
    title character varying(200) NOT NULL,
    requested_by character varying(24) NOT NULL,
    queued_at bigint NOT NULL
);


--
-- Name: room_queue_votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.room_queue_votes (
    id character varying(36) NOT NULL,
    room_id character varying(80) NOT NULL,
    video_id character varying(11) NOT NULL,
    voter_id character varying(120) NOT NULL,
    voted_at bigint NOT NULL
);


--
-- Name: room_skip_votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.room_skip_votes (
    id character varying(36) NOT NULL,
    room_id character varying(80) NOT NULL,
    session_id character varying(100) NOT NULL
);


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    token_hash character varying(64) NOT NULL,
    user_id character varying(36) NOT NULL,
    expires_at bigint NOT NULL
);


--
-- Name: user_task_claims; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_task_claims (
    id character varying(36) NOT NULL,
    user_id character varying(36) NOT NULL,
    task_id character varying(40) NOT NULL,
    exp_awarded integer NOT NULL,
    claimed_at bigint NOT NULL,
    claim_date date
);


--
-- Name: wardrobe_catalog_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wardrobe_catalog_items (
    tier integer NOT NULL,
    name character varying(32) NOT NULL,
    price bigint NOT NULL,
    frame_description character varying(240) NOT NULL,
    shirt_description character varying(240) NOT NULL,
    accent_color character varying(32) NOT NULL,
    soft_color character varying(48) NOT NULL,
    glow_color character varying(48) NOT NULL,
    shirt_color character varying(32) NOT NULL,
    sleeve_color character varying(32) NOT NULL,
    name_color character varying(32) NOT NULL,
    ornament_color character varying(32) NOT NULL,
    frame_light character varying(32) NOT NULL,
    frame_mid character varying(32) NOT NULL,
    frame_dark character varying(32) NOT NULL,
    frame_bg_top character varying(32) NOT NULL,
    frame_bg_bottom character varying(32) NOT NULL,
    frame_text character varying(32) NOT NULL,
    gem_light character varying(32) NOT NULL,
    gem_mid character varying(32) NOT NULL,
    gem_dark character varying(32) NOT NULL,
    CONSTRAINT wardrobe_catalog_items_price_check CHECK ((price >= 0))
);


--
-- Name: wardrobe_purchases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wardrobe_purchases (
    id character varying(36) NOT NULL,
    user_id character varying(36) NOT NULL,
    tier integer NOT NULL,
    amount_paid bigint NOT NULL,
    purchased_at bigint NOT NULL,
    CONSTRAINT wardrobe_purchases_amount_paid_check CHECK ((amount_paid >= 0))
);


--
-- Data for Name: admin_accounts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_accounts (id, username, password_salt, password_hash, created_at) FROM stdin;
\.


--
-- Data for Name: admin_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_sessions (token_hash, expires_at, revoked_at) FROM stdin;
ba467cb8cfcd5db8985a98ef841754f216f19d644d6f57b482e0c1d54ecfb44b	1796178014185	1793586040914
c1210c4c245528351fba32188cd2305429cd1b62694ebfc873137998e1eb8934	1796178047222	1793586869090
909a2f8f1ad711bac3d5ecea169f6bca958fd47cfd218514b29e1a712b899902	1796178875128	1793587124267
5d686e22a919d919810209f42c8dd5d8e79bf1bf4a894f1dd3203c3432b57c57	1796179130106	1793611803837
47e5c66049b3f7362f0cdba20e541c6d3b784b5df993a287d76f66058b38ebc2	1796203810988	1793612412525
0407aa663a52b3551d4690311992186e50e95064bbd09fb649a258795e96b6aa	1796204419982	1793634637413
9c34a3ff88e0ce2703f3cdc065b4b7a433537739d75baac80fe549185e7a0af9	1796226644487	\N
\.


--
-- Data for Name: cinema_rooms; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cinema_rooms (id, name, playback_video_id, playback_title, playback_source, playback_position, playback_playing, playback_updated_at, lofi_index, host_id, playback_duration_seconds) FROM stdin;
private-f0ccbee8	chill	ahBVHJVpPX0	Mashup Remix Chuẩn Trend TikTok - Bốn Chữ Lắm x Điều Anh Biết x LICK IT x Em Thua Cô Ta Remix	queue	0	t	1793593701120	3	\N	0
private-20baf720__outdoor	Khoa	knW7-x7Y7RE	Sơn Tùng M-TP - Hãy Trao Cho Anh ft. Snoop Dogg (Official MV)	lofi	2.943999999999221	t	1793860852737	2	\N	0
private-cac41c72__outdoor	góc phim	Llw9Q6akRo4	Sơn Tùng M-TP - Lạc Trôi (Official MV)	lofi	2.9429999999977667	t	1793860852741	0	\N	0
private-f0ccbee8__outdoor	chill	FN7ALfpGxiI	Sơn Tùng M-TP - Nơi Này Có Anh (Official MV)	lofi	2.941999999998984	t	1793860852742	1	\N	0
rap-chua-lanh__outdoor	Rạp chung	FN7ALfpGxiI	Sơn Tùng M-TP - Nơi Này Có Anh (Official MV)	lofi	0.19799999999992224	t	1793861002740	1	\N	0
private-20baf720	Khoa	ahBVHJVpPX0	Mashup Remix Chuẩn Trend TikTok - Bốn Chữ Lắm x Điều Anh Biết x LICK IT x Em Thua Cô Ta Remix	queue	0	t	1793592674756	4	\N	0
rap-chua-lanh	Rạp chung	knW7-x7Y7RE	Sơn Tùng M-TP - Hãy Trao Cho Anh ft. Snoop Dogg (Official MV)	lofi	4.7099999999999795	t	1793861042739	2	\N	0
private-cac41c72	góc phim	4RueRnbXLUY	Hai Chữ Đã Từng (Theron Remix) - Như Việt | Ngày Bên Nhau Em Nói Anh Là Người Cuối Cùng Remix	queue	0	t	1793590515480	2	\N	0
\.


--
-- Data for Name: cinema_users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cinema_users (id, username, password_salt, password_hash, display_name, avatar, shirt_color_index, accessory_index, hair_color_index, vip_tier, created_at, donation_transfer_code, donation_total_confirmed, donation_usable_balance, experience_points) FROM stdin;
e9ab1b6d-1e2c-470c-bf38-82b0281b71fe	khoa123	7tExI613H8nfnVIe8+RvNQ==	ltATfOgFFQG/4O1+czve8965fNh+HxX36djfC00rx0s=	Khoa	🐼	5	0	0	3	1793590719272	HEALING 344C613BF624 UNG HO	0	0	0
2e309da2-481f-4a33-a8b6-b566cd621421	bao123	AFqTLqD8NPdSGhfDeVL2zg==	DPl/Bq0YFJllcYk7gB75Q9tSHi5lREK/uTn0DcIP+rY=	Bao	🧸	0	0	0	3	1793602419256	HEALING 0437D341B8FB UNG HO	0	0	0
d3fb6233-53d2-4f06-89c8-acc3eda4b5d4	demo	eZNAC97yGojv9K20lghskA==	r2wUNUT1NxNhZzGBHi8uIyJA46IiLwk5TCOZwoLay6c=	Khoa	🐣	6	0	0	4	1793585949599	HEALING 22A8932B7E18 UNG HO	6500000	4900000	785
\.


--
-- Data for Name: flyway_schema_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.flyway_schema_history (installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success) FROM stdin;
1	1	initial schema	SQL	V1__initial_schema.sql	389285276	postgres	2026-11-02 09:19:04.891936	1537	t
2	2	ensure runtime tables	SQL	V2__ensure_runtime_tables.sql	-789839051	postgres	2026-11-02 09:19:06.45894	13	t
3	3	index case insensitive username lookup	SQL	V3__index_case_insensitive_username_lookup.sql	1222603313	postgres	2026-11-02 10:39:59.029222	9	t
4	4	room queue video votes	SQL	V4__room_queue_video_votes.sql	-1605708661	postgres	2026-11-02 11:32:48.589066	10	t
5	5	admin accounts	SQL	V5__admin_accounts.sql	-940622771	postgres	2026-11-02 14:45:55.544797	17	t
6	6	donation account balances	SQL	V6__donation_account_balances.sql	-130703875	postgres	2026-11-02 22:31:33.55373	44	t
7	7	one pending donation per user	SQL	V7__one_pending_donation_per_user.sql	1337182903	postgres	2026-11-02 22:47:58.221816	9	t
8	8	wardrobe catalog and purchases	SQL	V8__wardrobe_catalog_and_purchases.sql	310049147	postgres	2026-11-02 23:06:56.082233	21	t
9	9	room guest gender	SQL	V9__room_guest_gender.sql	-1856107939	postgres	2026-11-03 10:27:30.362744	16	t
10	10	room guest shirt color	SQL	V10__room_guest_shirt_color.sql	-226988114	postgres	2026-11-03 10:29:29.91599	2	t
11	11	user task experience	SQL	V11__user_task_experience.sql	-2003452888	postgres	2026-11-03 10:49:27.852215	26	t
12	12	room guest shirt tier	SQL	V12__room_guest_shirt_tier.sql	-941653197	postgres	2026-11-03 11:01:43.25904	4	t
13	13	daily task claims	SQL	V13__daily_task_claims	1504563215	postgres	2026-11-04 10:19:13.146848	11	t
14	14	update claim date	SQL	V14__update_claim_date.sql	-1828030428	postgres	2026-11-04 15:43:46.540524	5	t
15	15	personal screen media	SQL	V15__personal_screen_media.sql	-1846572687	postgres	2026-11-04 15:59:06.143952	27	t
16	16	guest dance action	SQL	V16__guest_dance_action.sql	1025269666	postgres	2026-11-05 09:29:59.896364	22	t
\.


--
-- Data for Name: payment_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payment_requests (id, user_id, username, tier, amount, memo, status, created_at, request_type, room_code, room_name, room_lofi_index) FROM stdin;
41b425f0-e508-49f1-b352-8d8ea57fb837	d3fb6233-53d2-4f06-89c8-acc3eda4b5d4	demo	4	200000	WETUBE VIP4 demo	APPROVED	1793586005766	VIP			0
e8456ec3-213c-4def-b599-735bb3b1c032	d3fb6233-53d2-4f06-89c8-acc3eda4b5d4	demo	0	10000	WETUBE PHONG RIENG demo	APPROVED	1793587107838	PRIVATE_ROOM	private-20baf720	Khoa	1
8b3f363f-5eb9-41e7-826d-7fcc059ff13f	d3fb6233-53d2-4f06-89c8-acc3eda4b5d4	demo	0	10000	WETUBE PHONG RIENG demo	APPROVED	1793590473686	PRIVATE_ROOM	private-cac41c72	góc phim	2
8a04cf66-1506-4d04-b63f-306162186cf7	e9ab1b6d-1e2c-470c-bf38-82b0281b71fe	khoa123	0	10000	WETUBE PHONG RIENG khoa123	APPROVED	1793590896839	PRIVATE_ROOM	private-f0ccbee8	chill	3
a9f68886-7bc9-4020-8d15-607c69c08a76	d3fb6233-53d2-4f06-89c8-acc3eda4b5d4	demo	3	70000	WETUBE VIP3 demo	APPROVED	1793602065590	VIP			0
eb293f5c-d699-466a-b71d-35c9ee073161	e9ab1b6d-1e2c-470c-bf38-82b0281b71fe	khoa123	3	70000	WETUBE VIP3 khoa123	APPROVED	1793602089224	VIP			0
5db6a3f9-7d38-4371-a306-bb786f9a7318	e9ab1b6d-1e2c-470c-bf38-82b0281b71fe	khoa123	2	50000	WETUBE VIP2 khoa123	APPROVED	1793602142116	VIP			0
74a5d186-3651-423f-9ac5-25970cb8fe76	2e309da2-481f-4a33-a8b6-b566cd621421	bao123	3	70000	HEALING VIP3 bao123	APPROVED	1793610207977	VIP			0
8d26f8fd-4fb6-41fe-bf89-1e1bc383fa7c	d3fb6233-53d2-4f06-89c8-acc3eda4b5d4	demo	5	500000	HEALING 22A8932B7E18 UNG HO	APPROVED	1793634513490	DONATION			0
ae1d97fc-bd0e-49a5-928f-35d79afd3e8c	d3fb6233-53d2-4f06-89c8-acc3eda4b5d4	demo	6	500000	HEALING VIP6 demo	REJECTED	1793635257881	VIP			0
c35601bb-36a8-48ee-a131-b860e6fba19c	d3fb6233-53d2-4f06-89c8-acc3eda4b5d4	demo	6	1000000	HEALING 22A8932B7E18 UNG HO	APPROVED	1793679729124	DONATION			0
783dc447-6ecf-484d-bcaf-0877ac4fbd57	d3fb6233-53d2-4f06-89c8-acc3eda4b5d4	demo	6	1000000	HEALING 22A8932B7E18 UNG HO	APPROVED	1793696436348	DONATION			0
2c4b5b6a-3eef-489b-b66e-b0985d3d7989	d3fb6233-53d2-4f06-89c8-acc3eda4b5d4	demo	6	1000000	HEALING 22A8932B7E18 UNG HO	APPROVED	1793696445430	DONATION			0
516c8d1f-5f5e-4930-9315-3f3a457b9183	d3fb6233-53d2-4f06-89c8-acc3eda4b5d4	demo	6	1000000	HEALING 22A8932B7E18 UNG HO	APPROVED	1793696452114	DONATION			0
1250c85d-5b0e-4f74-8cee-fc8f92a97ca0	d3fb6233-53d2-4f06-89c8-acc3eda4b5d4	demo	6	1000000	HEALING 22A8932B7E18 UNG HO	APPROVED	1793696456850	DONATION			0
83a5512b-a9a4-49f9-9dd5-f8270af0af53	d3fb6233-53d2-4f06-89c8-acc3eda4b5d4	demo	6	1000000	HEALING 22A8932B7E18 UNG HO	APPROVED	1793857180796	DONATION			0
\.


--
-- Data for Name: personal_media_uploads; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.personal_media_uploads (id, room_id, environment, uploaded_by, original_name, content_type, storage_name, duration_seconds, charged_amount, uploaded_at) FROM stdin;
041db1833dc74adfa11d7ad9af501f16	rap-chua-lanh	indoor	d3fb6233-53d2-4f06-89c8-acc3eda4b5d4	1785476365720_266768289291765540_6159247231719184621_f1704724b8a4640ee7068bf2f5901958.jpg	image/jpeg	041db1833dc74adfa11d7ad9af501f16.jpg	10	50000	1793843685515
4d8ecd83623d45a7bae8ee7f56c3cea0	rap-chua-lanh	outdoor	d3fb6233-53d2-4f06-89c8-acc3eda4b5d4	1785476365720_266768289291765540_6159247231719184621_f1704724b8a4640ee7068bf2f5901958.jpg	image/jpeg	4d8ecd83623d45a7bae8ee7f56c3cea0.jpg	10	50000	1793845408438
\.


--
-- Data for Name: room_chat_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.room_chat_messages (id, room_id, sender_id, sender_name, sender_avatar, message_text, message_time, vip_tier) FROM stdin;
7fcee169-944a-47e4-800f-ef750604fac3	rap-chua-lanh	73921f13-3ee7-41e8-904e-6c9f549bfc77	Khoa	🦊	hi	1793587300571	0
cfd62c57-4834-4d1f-9f52-dc477fc77a81	rap-chua-lanh	667d6a7a-f7f8-4351-9907-ca80d4d0f6d1	Khoa	🐻	hi	1793592432284	0
c50b8b6b-f84b-4628-a0cb-7a2934b9b73b	rap-chua-lanh	f0685f3e-db5d-4790-9287-44efd6a42a46	Khoa	🧸	😀	1793592838584	0
4591e662-075b-46a8-8b7e-f3a64f025899	rap-chua-lanh	dce1ae53-d359-4fd8-bab8-74c9cb892e36	Khoa	🐻	😂	1793593583554	0
164a95b3-b89e-4228-9f1f-f71338dd1b16	rap-chua-lanh	8e67c946-4827-4569-bad7-b5fe19a5e462	Khoa	🐻	hi	1793593957849	0
9803117d-0ac7-4a5b-b941-c8aff9c638fa	rap-chua-lanh	8c7fc1b0-173e-4809-8cd4-ce3a728fe2e3	Khoa	🐻	hi	1793598474333	4
da8bd523-346b-4280-a9e8-f460e5da144f	rap-chua-lanh	a2fea943-3016-430b-a3c3-ffd2c20101c7	Khoa	🐼	đ	1793602056675	0
11796587-6efc-4121-9854-5130b41d08b6	rap-chua-lanh	a2fea943-3016-430b-a3c3-ffd2c20101c7	Khoa	🐼	hello	1793602119847	3
8793b2ec-4f5a-4c31-b2dd-be8b13410e02	rap-chua-lanh	0f9351d0-7b25-44c4-843a-c31b16adf143	Khoa	🐣	👍	1793610276276	4
486fa3d5-6c20-4913-b526-6bf94ff154f9	rap-chua-lanh	0f9351d0-7b25-44c4-843a-c31b16adf143	Khoa	🐣	hi	1793610280468	4
8c0cce92-9005-4454-88a3-8ff9fdf070b8	rap-chua-lanh	e92d4674-8935-4a1e-95d8-ff4e9a302b5d	Khoa	🐣	hi	1793625502439	0
5acd95ac-ed4b-45dd-840b-14043b293cbf	rap-chua-lanh	372438ad-6e19-4bdf-b102-5c0bdd9b34f6	Khoa	🐣	😀	1793625674066	4
4a5eb3bf-9843-47a1-a16f-6940f200aa68	rap-chua-lanh	0805cb4d-7abc-40bb-8325-ede9bead64d5	Khoa	🐣	hi	1793636621484	0
be076835-b81b-4211-a9b9-a67e712b009f	rap-chua-lanh	982c16e7-3d70-4002-bdb1-02517b160774	Khoa	🐣	hi	1793670928369	0
8426fa3b-742f-4b4d-b761-555acdb6de83	private-20baf720	1772aa3f-e203-4b17-932d-9047669519f5	Khoa	🐣	hi	1793672353226	5
8e5fadee-1d13-4eed-9dab-cae5c409fb91	private-20baf720	c9c5e9fd-1969-49f7-a327-f7130f977e9a	Khoa	🐣	hi	1793672577087	5
17b51113-7cca-47b8-9b98-f45aab467306	private-20baf720	8cdb85f1-be77-404d-a566-fe338340e00d	Khoa	🐣	hi	1793672827758	5
37ac3c07-e87b-456a-9016-80a085dcf1b8	private-20baf720	8cdb85f1-be77-404d-a566-fe338340e00d	Khoa	🐣	hi	1793672838772	1
8d59742c-b88b-4369-b3e4-3d396ce61793	private-20baf720	8cdb85f1-be77-404d-a566-fe338340e00d	Khoa	🐣	hi	1793672849915	0
d5b926ae-c005-4a65-839c-3709a1947f9f	private-20baf720	8cdb85f1-be77-404d-a566-fe338340e00d	Khoa	🐣	hi	1793672861908	5
89d9877a-f64e-49bc-8a7d-b4c94f7720b8	rap-chua-lanh	a0c55231-f973-4a3d-bdaa-6416f9036231	Khoa	🐣	helo	1793678960521	5
6c07d427-3a7f-4c3c-ab06-75ac950b63d9	rap-chua-lanh	4e71ceef-8730-45cf-b5f3-10bd23143f28	Khoa	🐣	hi	1793680321797	6
8ad2bc7b-4a35-40a3-a606-153776d31ad4	rap-chua-lanh	fbce62e5-d8df-4b5e-b19e-d2a007c47616	Khoa	🐣	hi	1793690340730	6
5ac27ca2-1cce-469e-bdbe-b9fd7bec00b9	rap-chua-lanh	1527ff1c-ed99-4c54-9792-288f7ecc8312	Khoa	🐣	hello	1793692924692	6
fafb4578-2fdf-4348-b5f0-ea20b0d63d43	rap-chua-lanh	56b91eea-f45a-4177-a518-7ada0fac1d0e	Khoa	🐣	hi	1793693515608	6
c122eab5-ec33-4107-9c1d-d85b17200ac6	rap-chua-lanh	56b91eea-f45a-4177-a518-7ada0fac1d0e	Khoa	🐣	hi	1793693556392	6
990b6ada-4b40-4eb3-9b8c-e66b1617d72d	rap-chua-lanh	56b91eea-f45a-4177-a518-7ada0fac1d0e	Khoa	🐣	hi	1793693622816	6
213c97e8-7bc1-4366-a8f5-a0f0bb46e0cd	rap-chua-lanh	56b91eea-f45a-4177-a518-7ada0fac1d0e	Khoa	🐣	hello	1793693634123	6
7308641f-d95d-4e00-99a7-b768169a4891	rap-chua-lanh	56b91eea-f45a-4177-a518-7ada0fac1d0e	Khoa	🐣	hello	1793693643278	6
dd0a6d88-2981-47d6-bd93-06004171eff7	rap-chua-lanh	56b91eea-f45a-4177-a518-7ada0fac1d0e	Khoa	🐣	ê	1793693660539	6
01276c1f-3395-4dc6-b568-1a6a21b9f5f3	rap-chua-lanh	56b91eea-f45a-4177-a518-7ada0fac1d0e	Khoa	🐣	e	1793693667915	6
e9cda29e-fcca-4b59-99d1-2a8eff8b2a7d	rap-chua-lanh	56b91eea-f45a-4177-a518-7ada0fac1d0e	Khoa	🐣	fweffef	1793693670386	6
6bf5d8a2-31bd-4e23-9ec1-723d544bad2b	rap-chua-lanh	95076980-9f1b-445f-ae0d-ecc4065cc915	Khoa	🐣	hello	1793693769233	6
1b2227cf-f24e-4a72-97a0-d0973d229f3b	rap-chua-lanh	d592ae67-0b34-42ce-bf0a-73b01d9002a4	Khoa	🐣	hi	1793694064212	6
9e1b2af4-59d7-4760-9634-a7973f87b603	rap-chua-lanh	9da06f5c-5fd7-4769-bab0-46ec86dd8f9f	Khoa	🐣	hello	1793720566474	6
f0b7760a-b5ef-4f42-a668-d65b56951703	rap-chua-lanh	b906d89f-62e9-43b7-b663-8e6dafd842db	Khoa	🐣	hi	1793764748617	6
9604afb7-b07b-4747-9abc-9f058172acbc	rap-chua-lanh	b906d89f-62e9-43b7-b663-8e6dafd842db	Khoa	🐣	123	1793764762243	6
4b939453-34c9-436e-8b08-4a79179e1644	rap-chua-lanh	d28bcd60-cb31-45cd-9575-76531dcb6fc7	Khoa	🐣	hi	1793769712214	6
b5971d65-6310-4cc3-b8ae-338bf69d32fd	rap-chua-lanh	be960643-fd99-4b9e-9bdf-ddabf19f8bb9	Khoa	🐣	hi	1793781029028	6
ca7d633d-e38c-4aeb-8b9d-057c5dd0d1dc	rap-chua-lanh	ae7fe9ab-06ca-49ff-8973-b97a22fbd014	Khoa	🐣	👏	1793781177928	6
45472924-7ebe-466a-a32a-60fb11485ec7	rap-chua-lanh	df2c3155-d5eb-47fb-b5c7-40a010bfb77b	Khoa	🐣	HI	1793845386755	6
05fceced-5bd6-479b-83d9-aa5460d8f5d5	rap-chua-lanh	df2c3155-d5eb-47fb-b5c7-40a010bfb77b	Khoa	🐣	DM	1793845392330	6
68063761-5cc6-48b7-b3f8-268bf0756aa6	rap-chua-lanh	c951d381-4f97-4c5e-b339-55fe6e12d4e0	Khoa	🐣	hi	1793856816725	6
cbb08c3b-b36f-4278-a26b-cf5f2e044ddb	rap-chua-lanh	c951d381-4f97-4c5e-b339-55fe6e12d4e0	Khoa	🐣	hi	1793856818774	6
\.


--
-- Data for Name: room_guests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.room_guests (id, room_id, client_id, user_id, name, avatar, x, y, face, seat, shirt_color_index, accessory_index, hair_color_index, vip_tier, last_move_at, joined_at, gender, shirt_color, shirt_tier, action, dance_action) FROM stdin;
\.


--
-- Data for Name: room_queue_videos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.room_queue_videos (id, room_id, video_id, title, requested_by, queued_at) FROM stdin;
d6d4cb44-122f-4c61-aaba-a9f5c89c946b	private-f0ccbee8	3hGcXBGGcKU	Thương Nhau Đến Thế Remix, Tương Tư Anh Như Nắm Tro Tàn Remix🎼Nhạc Remix TikTok Hay 2026	Khoa	1793593711524
d50b8744-0051-43ac-af30-4ec211b794b4	private-20baf720	4RueRnbXLUY	Hai Chữ Đã Từng (Theron Remix) - Như Việt | Ngày Bên Nhau Em Nói Anh Là Người Cuối Cùng Remix	Khoa	1793611750546
\.


--
-- Data for Name: room_queue_votes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.room_queue_votes (id, room_id, video_id, voter_id, voted_at) FROM stdin;
\.


--
-- Data for Name: room_skip_votes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.room_skip_votes (id, room_id, session_id) FROM stdin;
\.


--
-- Data for Name: user_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_sessions (token_hash, user_id, expires_at) FROM stdin;
70ca57549e251825d3c7b16da060be4d9a9b8a87d8bb365314497235dacc3558	d3fb6233-53d2-4f06-89c8-acc3eda4b5d4	1796177989480
a440ef8a053f2108de70b7fe870808d33bb9f054e667adbff57a133ec702b1b4	e9ab1b6d-1e2c-470c-bf38-82b0281b71fe	1796182719274
d1c5ad501765172dfb5294fdf640e1407abe46f887bb2d16783e05bd5a29a089	2e309da2-481f-4a33-a8b6-b566cd621421	1796194419258
b98ae5e9ee944a8fadec12371819cc6f085c1dbe3615f7e05991616e4b245908	d3fb6233-53d2-4f06-89c8-acc3eda4b5d4	1796194450096
3f26f6d30640e095e790cf7ad86b9127068eb0b99d36e404dd91a869c6141fb8	d3fb6233-53d2-4f06-89c8-acc3eda4b5d4	1796194864618
36815cb7bd6ba83358017db0d1ceeb9f5e9393424668bcff60f2fdc72d566c9b	d3fb6233-53d2-4f06-89c8-acc3eda4b5d4	1796202171330
751ab5d74bd17a52881ff7f8a367364444ee6c19fe97d90f8c9293374c526614	d3fb6233-53d2-4f06-89c8-acc3eda4b5d4	1796204594796
c334e88cca44235fffef6eb52b45c4667c7a90c5a7e015291b1a7b0b93f6585d	d3fb6233-53d2-4f06-89c8-acc3eda4b5d4	1796217531931
8e36e566dd04a6dd90ce30f1e8930b6ea414b756fc18c8afa65df02ee87638d1	d3fb6233-53d2-4f06-89c8-acc3eda4b5d4	1796224121040
907f47692f89e6805aaf7fa6bd78a4c1436c97b515cc2c8f5a6917cf49ecaacb	d3fb6233-53d2-4f06-89c8-acc3eda4b5d4	1796277832832
\.


--
-- Data for Name: user_task_claims; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_task_claims (id, user_id, task_id, exp_awarded, claimed_at, claim_date) FROM stdin;
168b88e2-e091-4889-8ed7-3b883ecd95bf	d3fb6233-53d2-4f06-89c8-acc3eda4b5d4	seat	20	1793677904097	2026-11-03
e74c333c-b82f-480d-9d6a-ab0f4b5c0485	d3fb6233-53d2-4f06-89c8-acc3eda4b5d4	style	25	1793677905404	2026-11-03
5b7f7b51-60c7-4ccb-be82-54c5b9290dd2	d3fb6233-53d2-4f06-89c8-acc3eda4b5d4	donation	50	1793677906053	2026-11-03
640d427e-689b-40ee-b563-0aa8273de05b	d3fb6233-53d2-4f06-89c8-acc3eda4b5d4	wardrobe	40	1793677906488	2026-11-03
7eae9a00-040a-4780-b2e6-ff08beca1ad5	d3fb6233-53d2-4f06-89c8-acc3eda4b5d4	chat	50	1793680324946	2026-11-03
bb1f9153-a9d0-431b-b98c-820e23b9e057	d3fb6233-53d2-4f06-89c8-acc3eda4b5d4	seat	50	1793782346478	2026-11-04
be122608-ef41-404b-a14a-768942207c1d	d3fb6233-53d2-4f06-89c8-acc3eda4b5d4	style	50	1793782348965	2026-11-04
dff36db9-d0cd-4529-8f89-b88a808758e9	d3fb6233-53d2-4f06-89c8-acc3eda4b5d4	donation	100	1793782351350	2026-11-04
457207d9-0a49-4b89-b2f1-7b1b0e32b70d	d3fb6233-53d2-4f06-89c8-acc3eda4b5d4	wardrobe	100	1793782352633	2026-11-04
0a59ec29-7dbe-4288-81c9-9105d30e160d	d3fb6233-53d2-4f06-89c8-acc3eda4b5d4	seat	50	1793843590568	2026-11-05
1d2db6eb-5876-4859-bf03-32e1d7fd4d9c	d3fb6233-53d2-4f06-89c8-acc3eda4b5d4	style	50	1793843591274	2026-11-05
df447168-815b-420e-9440-ac306159c801	d3fb6233-53d2-4f06-89c8-acc3eda4b5d4	donation	100	1793843592201	2026-11-05
a52b9f4f-b481-4f1a-865d-aae0a0b9e51b	d3fb6233-53d2-4f06-89c8-acc3eda4b5d4	wardrobe	100	1793843593044	2026-11-05
\.


--
-- Data for Name: wardrobe_catalog_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.wardrobe_catalog_items (tier, name, price, frame_description, shirt_description, accent_color, soft_color, glow_color, shirt_color, sleeve_color, name_color, ornament_color, frame_light, frame_mid, frame_dark, frame_bg_top, frame_bg_bottom, frame_text, gem_light, gem_mid, gem_dark) FROM stdin;
0	Mặc định	0	Nhẹ nhàng, mộc mạc.	Áo tím xanh dịu nhẹ, thân quen như chiếc ghế yêu thích.	#a9b0a7	rgba(169,176,167,0.10)	transparent	#a9b4e6	#9ca8dc	#2b3358	#c5c9c0	#c5c9c0	#929b90	#657065	#20271f	#151b16	#f2f5ee	#e6e9de	#b5bdaf	#788276
1	Đồng Cỏ May	20000	Một chút ánh vàng ấm áp cho lời nhắn của bạn.	Áo màu trà ấm với đường chỉ vàng nhỏ.	#f2c46d	rgba(242,196,109,0.10)	rgba(242,196,109,0.35)	#77613e	#685434	#fff1c9	#f2c46d	#f6d98b	#d9a63c	#a8741c	#2e1d0e	#170f07	#f5e1a4	#fff3c4	#e0ae45	#a8741c
2	Ánh Trăng Bạc	50000	Sắc xanh dịu, nổi bật vừa đủ giữa cả rạp.	Áo xanh trời điểm viền sáng như ánh đèn rạp.	#6cb4ff	rgba(108,180,255,0.10)	rgba(108,180,255,0.38)	#426b91	#385d82	#e5f4ff	#6cb4ff	#b9e2ff	#6cb4ff	#3176b7	#10253d	#081522	#d8efff	#effaff	#73c2ff	#3176b7
3	Hoàng Kim Vương Giả	100000	Tông đỏ cam rực rỡ dành cho người nhiều năng lượng.	Áo đỏ san hô với huy hiệu nhỏ trước ngực.	#ff7a7a	rgba(255,122,122,0.11)	rgba(255,92,79,0.42)	#904f4b	#7f403d	#ffe7df	#ff8b67	#ffc0a0	#f07754	#a94236	#351613	#1c0c0a	#ffe0ce	#fff0dc	#ff9c6b	#a94236
4	Tinh Vân Kim Cương	200000	Ánh tím huyền ảo, mềm mại mà khác biệt.	Áo tím khói có điểm nhấn ánh kim nhẹ.	#b79cff	rgba(183,156,255,0.10)	rgba(183,156,255,0.38)	#695d91	#5b507f	#f0e9ff	#c7b4ff	#dfd2ff	#ad8cff	#7256ba	#241a3b	#120d20	#efe6ff	#faf4ff	#b99bff	#7256ba
5	Hỏa Long Bảo Châu	500000	Sắc bạc hà thanh mát với điểm nhấn ngọc sáng.	Áo xanh bạc hà thoáng mát, viền ngọc mềm.	#5fe3c0	rgba(95,227,192,0.10)	rgba(95,227,192,0.38)	#3f8074	#347267	#e2fff7	#75f0d0	#c4fff0	#5fe3c0	#239d83	#102d29	#081915	#e0fff7	#f3fffb	#74eccd	#239d83
6	Thần Long Hoàng Gia	1000000	Ánh cam vàng sang trọng cho dấu ấn khó quên.	Áo cam vàng quyền quý với huy hiệu ánh kim.	#ffb347	rgba(255,179,71,0.10)	rgba(255,155,57,0.42)	#865a35	#754b2c	#fff0d7	#ffc46d	#ffe0a0	#ffb347	#b96b24	#341c10	#1c0d08	#ffebc3	#fff7de	#ffc05c	#b96b24
\.


--
-- Data for Name: wardrobe_purchases; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.wardrobe_purchases (id, user_id, tier, amount_paid, purchased_at) FROM stdin;
23f5f5f8-8a62-4c0d-83fe-2e83ffd326c2	d3fb6233-53d2-4f06-89c8-acc3eda4b5d4	5	500000	1793636286658
58575d88-e6e3-4933-a393-e74807696838	d3fb6233-53d2-4f06-89c8-acc3eda4b5d4	6	1000000	1793679803467
\.


--
-- Name: admin_accounts admin_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_accounts
    ADD CONSTRAINT admin_accounts_pkey PRIMARY KEY (id);


--
-- Name: admin_sessions admin_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_sessions
    ADD CONSTRAINT admin_sessions_pkey PRIMARY KEY (token_hash);


--
-- Name: cinema_rooms cinema_rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cinema_rooms
    ADD CONSTRAINT cinema_rooms_pkey PRIMARY KEY (id);


--
-- Name: cinema_users cinema_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cinema_users
    ADD CONSTRAINT cinema_users_pkey PRIMARY KEY (id);


--
-- Name: cinema_users cinema_users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cinema_users
    ADD CONSTRAINT cinema_users_username_key UNIQUE (username);


--
-- Name: flyway_schema_history flyway_schema_history_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flyway_schema_history
    ADD CONSTRAINT flyway_schema_history_pk PRIMARY KEY (installed_rank);


--
-- Name: payment_requests payment_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_requests
    ADD CONSTRAINT payment_requests_pkey PRIMARY KEY (id);


--
-- Name: personal_media_uploads personal_media_uploads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_media_uploads
    ADD CONSTRAINT personal_media_uploads_pkey PRIMARY KEY (id);


--
-- Name: personal_media_uploads personal_media_uploads_storage_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_media_uploads
    ADD CONSTRAINT personal_media_uploads_storage_name_key UNIQUE (storage_name);


--
-- Name: room_chat_messages room_chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_chat_messages
    ADD CONSTRAINT room_chat_messages_pkey PRIMARY KEY (id);


--
-- Name: room_guests room_guests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_guests
    ADD CONSTRAINT room_guests_pkey PRIMARY KEY (id);


--
-- Name: room_queue_videos room_queue_videos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_queue_videos
    ADD CONSTRAINT room_queue_videos_pkey PRIMARY KEY (id);


--
-- Name: room_queue_votes room_queue_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_queue_votes
    ADD CONSTRAINT room_queue_votes_pkey PRIMARY KEY (id);


--
-- Name: room_skip_votes room_skip_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_skip_votes
    ADD CONSTRAINT room_skip_votes_pkey PRIMARY KEY (id);


--
-- Name: room_guests uq_room_guest_seat; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_guests
    ADD CONSTRAINT uq_room_guest_seat UNIQUE (room_id, seat);


--
-- Name: room_queue_videos uq_room_queue_video; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_queue_videos
    ADD CONSTRAINT uq_room_queue_video UNIQUE (room_id, video_id);


--
-- Name: room_queue_votes uq_room_queue_vote_voter; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_queue_votes
    ADD CONSTRAINT uq_room_queue_vote_voter UNIQUE (room_id, video_id, voter_id);


--
-- Name: room_skip_votes uq_room_skip_voter; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_skip_votes
    ADD CONSTRAINT uq_room_skip_voter UNIQUE (room_id, session_id);


--
-- Name: user_task_claims uq_user_task_claim; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_task_claims
    ADD CONSTRAINT uq_user_task_claim UNIQUE (user_id, task_id, claim_date);


--
-- Name: wardrobe_purchases uq_wardrobe_purchase_user_tier; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wardrobe_purchases
    ADD CONSTRAINT uq_wardrobe_purchase_user_tier UNIQUE (user_id, tier);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (token_hash);


--
-- Name: user_task_claims user_task_claims_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_task_claims
    ADD CONSTRAINT user_task_claims_pkey PRIMARY KEY (id);


--
-- Name: wardrobe_catalog_items wardrobe_catalog_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wardrobe_catalog_items
    ADD CONSTRAINT wardrobe_catalog_items_pkey PRIMARY KEY (tier);


--
-- Name: wardrobe_purchases wardrobe_purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wardrobe_purchases
    ADD CONSTRAINT wardrobe_purchases_pkey PRIMARY KEY (id);


--
-- Name: flyway_schema_history_s_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX flyway_schema_history_s_idx ON public.flyway_schema_history USING btree (success);


--
-- Name: idx_cinema_users_username_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cinema_users_username_upper ON public.cinema_users USING btree (upper((username)::text));


--
-- Name: idx_payment_room_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_room_code ON public.payment_requests USING btree (room_code);


--
-- Name: idx_payment_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_status_created ON public.payment_requests USING btree (status, created_at);


--
-- Name: idx_payment_user_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_user_status ON public.payment_requests USING btree (user_id, status);


--
-- Name: idx_personal_media_room; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_personal_media_room ON public.personal_media_uploads USING btree (room_id, uploaded_at);


--
-- Name: idx_room_chat_history; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_room_chat_history ON public.room_chat_messages USING btree (room_id, message_time);


--
-- Name: idx_room_guests_room; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_room_guests_room ON public.room_guests USING btree (room_id);


--
-- Name: idx_room_queue_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_room_queue_order ON public.room_queue_videos USING btree (room_id, queued_at);


--
-- Name: idx_room_queue_votes_video; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_room_queue_votes_video ON public.room_queue_votes USING btree (room_id, video_id);


--
-- Name: idx_user_sessions_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_expiry ON public.user_sessions USING btree (expires_at);


--
-- Name: idx_user_task_claims_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_task_claims_user ON public.user_task_claims USING btree (user_id);


--
-- Name: idx_wardrobe_purchases_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wardrobe_purchases_user ON public.wardrobe_purchases USING btree (user_id, tier DESC);


--
-- Name: uq_admin_accounts_username_ci; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_admin_accounts_username_ci ON public.admin_accounts USING btree (lower((username)::text));


--
-- Name: uq_cinema_users_donation_transfer_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cinema_users_donation_transfer_code ON public.cinema_users USING btree (donation_transfer_code);


--
-- Name: uq_pending_donation_per_user; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_pending_donation_per_user ON public.payment_requests USING btree (user_id) WHERE (((request_type)::text = 'DONATION'::text) AND ((status)::text = 'PENDING'::text));


--
-- Name: room_queue_votes fk_room_queue_vote_video; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_queue_votes
    ADD CONSTRAINT fk_room_queue_vote_video FOREIGN KEY (room_id, video_id) REFERENCES public.room_queue_videos(room_id, video_id) ON DELETE CASCADE;


--
-- Name: personal_media_uploads personal_media_uploads_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_media_uploads
    ADD CONSTRAINT personal_media_uploads_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.cinema_rooms(id) ON DELETE CASCADE;


--
-- Name: personal_media_uploads personal_media_uploads_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_media_uploads
    ADD CONSTRAINT personal_media_uploads_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.cinema_users(id) ON DELETE CASCADE;


--
-- Name: user_task_claims user_task_claims_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_task_claims
    ADD CONSTRAINT user_task_claims_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.cinema_users(id) ON DELETE CASCADE;


--
-- Name: wardrobe_purchases wardrobe_purchases_tier_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wardrobe_purchases
    ADD CONSTRAINT wardrobe_purchases_tier_fkey FOREIGN KEY (tier) REFERENCES public.wardrobe_catalog_items(tier);


--
-- Name: wardrobe_purchases wardrobe_purchases_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wardrobe_purchases
    ADD CONSTRAINT wardrobe_purchases_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.cinema_users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 8aaLUqbzZRsRWbfTm2OStmFAlFqfQ9uF1C6eOn2cfmi7vgKA480Rj8JTpSCk9P0

