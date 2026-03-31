-- ─── Invites ─────────────────────────────────────────────────────────────────
-- Tracks who invited whom via the onboarding flow.
-- referral_code is a short unique token embedded in the invite deep link.
-- When the invited person signs up, we match their phone/email to claim the invite.

create table public.invites (
  id              uuid        primary key default gen_random_uuid(),
  inviter_id      uuid        not null references public.profiles(id) on delete cascade,
  referral_code   text        unique not null,
  invitee_phone   text,           -- phone number the SMS was sent to
  invitee_name    text,           -- contact display name (for UI)
  invitee_id      uuid        references public.profiles(id) on delete set null, -- filled when invitee signs up
  status          text        not null default 'sent' check (status in ('sent', 'accepted')),
  created_at      timestamptz not null default now()
);

alter table public.invites enable row level security;

create policy "Users can read own invites"
  on public.invites for select
  using (auth.uid() = inviter_id);

create policy "Users can insert own invites"
  on public.invites for insert
  with check (auth.uid() = inviter_id);

-- Index for looking up invites by referral code (used during sign-up)
create index invites_referral_code_idx on public.invites (referral_code);

-- Index for finding pending invites for a phone number (used to auto-friend)
create index invites_invitee_phone_idx on public.invites (invitee_phone) where invitee_id is null;
