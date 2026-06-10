DROP INDEX IF EXISTS idx_user_subscriptions_one_active_paid;

DO $$
DECLARE
  old_type_has_team BOOLEAN;
  pro_target_label TEXT;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'user_subscriptions'
      AND column_name = 'plan_tier'
  )
  AND EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'subscription_plan_tier'
  ) THEN
    SELECT EXISTS (
      SELECT 1
      FROM pg_enum enum_value
      JOIN pg_type enum_type
        ON enum_type.oid = enum_value.enumtypid
      WHERE enum_type.typname = 'subscription_plan_tier'
        AND enum_value.enumlabel = 'team'
    )
    INTO old_type_has_team;

    pro_target_label := CASE
      WHEN old_type_has_team THEN 'plus'
      ELSE 'pro'
    END;

    EXECUTE 'DROP TYPE IF EXISTS subscription_plan_tier_plus_pro_next';
    EXECUTE $sql$
      CREATE TYPE subscription_plan_tier_plus_pro_next AS ENUM (
        'free',
        'plus',
        'pro'
      )
    $sql$;

    EXECUTE 'ALTER TABLE user_subscriptions ALTER COLUMN plan_tier DROP DEFAULT';
    EXECUTE format(
      $sql$
        ALTER TABLE user_subscriptions
        ALTER COLUMN plan_tier TYPE subscription_plan_tier_plus_pro_next
        USING (
          CASE plan_tier::text
            WHEN 'team' THEN 'pro'
            WHEN 'pro' THEN %L
            WHEN 'plus' THEN 'plus'
            WHEN 'free' THEN 'free'
            ELSE 'free'
          END
        )::subscription_plan_tier_plus_pro_next
      $sql$,
      pro_target_label
    );
    EXECUTE $sql$
      ALTER TABLE user_subscriptions
      ALTER COLUMN plan_tier SET DEFAULT 'free'::subscription_plan_tier_plus_pro_next
    $sql$;
    EXECUTE 'DROP TYPE subscription_plan_tier';
    EXECUTE 'ALTER TYPE subscription_plan_tier_plus_pro_next RENAME TO subscription_plan_tier';
  END IF;
END $$;

CREATE UNIQUE INDEX idx_user_subscriptions_one_active_paid
  ON user_subscriptions (user_id)
  WHERE plan_tier <> 'free'
    AND status IN ('authenticated', 'active', 'pending');
