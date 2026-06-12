-- Two-level human feedback (seed Q15, first implementation):
-- level 1 is a good/neutral/bad sentiment ("faces"), level 2 an optional
-- written comment added after the fact. Sentiment-only events carry no
-- decision, so decision becomes nullable.

alter table feedback_events
  add column if not exists sentiment text
    check (sentiment in ('good', 'neutral', 'bad'));

alter table feedback_events
  alter column decision drop not null;

-- At least one of the two signals must be present.
alter table feedback_events
  add constraint feedback_events_signal_check
    check (sentiment is not null or decision is not null);

create index if not exists idx_feedback_events_created_at
  on feedback_events(created_at desc);
