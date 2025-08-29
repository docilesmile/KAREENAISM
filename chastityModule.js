// ---------------- Helper: get latest chastity status ----------------
async function getChastityStatus() {
  if (!window.currentUser) return;

  const { data, error } = await supabase
    .from("chastityStatus")
    .select("*")
    .eq("user_id", window.currentUser.id)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) return console.error(error);

  if (!data || data.length === 0) {
    statusP.innerText = "You are not locked. Goddess has not dictated your chastity yet.";
    return;
  }

  const latest = data[0];
  const now = new Date();
  const releaseDate = new Date(latest.release_date);

  if (latest.is_locked && releaseDate > now) {
    // Calculate remaining time
    const remainingMs = releaseDate - now;
    const remaining = {
      days: Math.floor(remainingMs / (1000 * 60 * 60 * 24)),
      hours: Math.floor((remainingMs / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((remainingMs / (1000 * 60)) % 60)
    };

    statusP.innerText = `
      Locked until ${releaseDate.toLocaleString()}.
      Remaining: ${remaining.days}d ${remaining.hours}h ${remaining.minutes}m.
      Source: ${latest.source || "Goddess KAREENA"}
    `;
  } else {
    statusP.innerText = "You are not locked. Goddess may decide soon.";
  }
}

// ---------------- Reduce chastity time by minutes ----------------
window.reduceTimeForTask = async function(minutes) {
  if (!window.currentUser) return;

  const { data, error } = await supabase
    .from("chastityStatus")
    .select("*")
    .eq("user_id", window.currentUser.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) return;
  const latest = data[0];
  if (!latest.is_locked) return;

  const newRelease = new Date(new Date(latest.release_date).getTime() - minutes * 60 * 1000);

  await supabase
    .from("chastityStatus")
    .update({
      release_date: newRelease,
      total_reduced: (latest.total_reduced || 0) + minutes
    })
    .eq("id", latest.id);

  getChastityStatus();
};
