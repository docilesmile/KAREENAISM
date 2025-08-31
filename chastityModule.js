// chastityModule.js
import { supabase } from './supabaseClient.js';

export async function lockChastity(userId, durationHours, source="Goddess KAREENA") {
  const releaseDate = new Date();
  releaseDate.setHours(releaseDate.getHours() + durationHours);

  await supabase.from("chastityStatus").upsert({
    user_id: userId,
    is_locked: true,
    release_date: releaseDate,
    source
  });
}

export async function unlockChastity(userId) {
  await supabase.from("chastityStatus")
    .update({ is_locked: false })
    .eq("user_id", userId);
}

export async function adjustChastityTime(userId, hours) {
  const { data: status } = await supabase
    .from("chastityStatus")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!status || !status.is_locked) return;

  const newDate = new Date(status.release_date);
  newDate.setHours(newDate.getHours() + hours);

  await supabase.from("chastityStatus")
    .update({ release_date: newDate })
    .eq("id", status.id);
}

// Daily reset: apply penalties for missed tasks
export async function dailyReset(userId) {
  const now = new Date();
  const today = new Date();
  today.setHours(today.getHours() - 4); // 4AM reset
  const dayKey = today.toISOString().split("T")[0];

  const { data: tasks } = await supabase
    .from("rolled_tasks")
    .select("*")
    .eq("user_id", userId)
    .like("created_at", `${dayKey}%`)
    .eq("completed", false);

  if (tasks && tasks.length > 0) {
    for (let task of tasks) {
      const { data: rule } = await supabase
        .from("PenaltyRules")
        .select("*")
        .eq("difficulty", task.difficulty)
        .single();

      if (rule) await adjustChastityTime(userId, rule.penalty);
    }
  }

  // clear rolled tasks
  await supabase.from("rolled_tasks").delete().eq("user_id", userId);
}
