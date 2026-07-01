CREATE OR REPLACE FUNCTION rpc_move_deal(
  p_deal_id TEXT,
  p_old_stage_id TEXT,
  p_new_stage_id TEXT,
  p_new_stage_enum TEXT,
  p_is_stage_change BOOLEAN,
  p_workspace_id TEXT,
  p_actor_membership_id TEXT,
  p_duration_in_previous_stage_seconds INT,
  p_source_updates JSONB,
  p_target_updates JSONB
) RETURNS VOID AS $$
DECLARE
  v_rec JSONB;
BEGIN
  -- 1. Update source deals positions
  IF p_is_stage_change THEN
    FOR v_rec IN SELECT * FROM jsonb_array_elements(p_source_updates)
    LOOP
      UPDATE "Deal" SET "position" = (v_rec->>'position')::INT WHERE "id" = v_rec->>'id';
    END LOOP;
  END IF;

  -- 2. Update target deals positions
  FOR v_rec IN SELECT * FROM jsonb_array_elements(p_target_updates)
  LOOP
    IF v_rec->>'id' = p_deal_id THEN
      IF p_is_stage_change THEN
        UPDATE "Deal" 
        SET "position" = (v_rec->>'position')::INT,
            "stageId" = p_new_stage_id,
            "stage" = p_new_stage_enum::"DealStage",
            "enteredStageAt" = timezone('utc', now())
        WHERE "id" = p_deal_id;
      ELSE
        UPDATE "Deal" SET "position" = (v_rec->>'position')::INT WHERE "id" = p_deal_id;
      END IF;
    ELSE
      UPDATE "Deal" SET "position" = (v_rec->>'position')::INT WHERE "id" = v_rec->>'id';
    END IF;
  END LOOP;

  -- 3. Create transition if changed
  IF p_is_stage_change THEN
    INSERT INTO "DealStageTransition" (
      "id", "workspaceId", "dealId", "actorMembershipId", "fromStageId", "toStageId", "durationInPreviousStageSeconds"
    ) VALUES (
      gen_random_uuid()::text, p_workspace_id, p_deal_id, p_actor_membership_id, p_old_stage_id, p_new_stage_id, p_duration_in_previous_stage_seconds
    );
  END IF;
END;
$$ LANGUAGE plpgsql;
