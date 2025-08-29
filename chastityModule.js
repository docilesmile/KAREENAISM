// chastityModule.js
export async function loadChastityModule(supabase) {
  const modulesContainer = document.getElementById("modulesContainer");
  if (!modulesContainer) return;

  const chastityDiv = document.createElement("div");
  chastityDiv.id = "chastityModule";
  chastityDiv.innerHTML = `
    <h2>Chastity Status</h2>
    <p id="chastityStatus">Loading...</p>
    <button id="goddessLockBtn">Submit to Goddess KAREENA</button>
  `;
  modulesContainer.appendChild(chastityDiv);

  const chastityStatus = document.getElementById("chastityStatus");
  const goddessLockBtn = document.getElementById("goddessLockBtn");

  // Helper: Calculate release date
  function calculateReleaseDate(lockType) {
    const now = new Date();
    let days = 0;
    switch (lockType) {
      case "short": days = 2; break;
      case "medium": days = 5; break;
      case "long": days = 7; break;
      case "extended": days = 14; break;
      case "custom": days = 21; break;
    }
    const release = new Date(now);
    release.setDate(release.getDate() + days);
    return release.toISOString();
  }

  // Helper: check for mandatory lock dates
  function isMandatoryLock() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const date = now.getDate();
    // Example: lock 7 days before Her birthday (21 Sept)
    if ((month === 9 && date >= 14 && date <= 21)) return true;
    return false;
  }

  async function getChastityStatus() {
    if (!window.currentUser) return;

    const { data, error } = await supabase
      .from("chastityStatus")
      .select("*")
      .eq("user_id", window.currentUser.id)
      .single();

    if (error) {
      // If no record, create one
      const { error: insertErr } = await supabase
        .from("chastityStatus")
        .insert({
          user_id: window.currentUser.id,
          is_locked: false,
          release_date: null,
          source: "init",
          created_at: new Date(),
          updated_at: new Date()
        });
      if (insertErr) return console.error(insertErr);
      return getChastityStatus();
    }

    let statusText = "";
    if (data.is_locked) {
      const release = new Date(data.release_date);
      const now = new Date();
      if (release > now) {
        statusText = `You are locked in chastity until ${release.toLocaleString()}.`;
      } else {
        // Unlock automatically
        await supabase
          .from("chastityStatus")
          .update({ is_locked: false, release_date: null, updated_at: new Date() })
          .eq("user_id", window.currentUser.id);
        statusText = "You are currently unlocked.";
      }
    } else {
      statusText = "You are currently unlocked.";
    }

    // Show mandatory lock message
    if (isMandatoryLock()) {
      statusText += " Goddess KAREENA mandates chastity now!";
    }

    chastityStatus.innerText = statusText;
  }

  goddessLockBtn.addEventListener("click", async () => {
    if (!window.currentUser) return;

    // Determine lock type
    let lockType = "short"; // default
    if (isMandatoryLock()) lockType = "extended";
    else {
      const types = ["short","medium","long","extended","custom"];
      lockType = types[Math.floor(Math.random()*types.length)];
    }

    const releaseDate = calculateReleaseDate(lockType);

    // Update or insert record
    const { data: existing, error } = await supabase
      .from("chastityStatus")
      .select("*")
      .eq("user_id", window.currentUser.id)
      .single();

    if (error || !existing) {
      await supabase.from("chastityStatus").insert({
        user_id: window.currentUser.id,
        is_locked: true,
        release_date: releaseDate,
        source: "goddessDecision",
        created_at: new Date(),
        updated_at: new Date()
      });
    } else {
      await supabase.from("chastityStatus").update({
        is_locked: true,
        release_date: releaseDate,
        source: "goddessDecision",
        updated_at: new Date()
      }).eq("user_id", window.currentUser.id);
    }

    await getChastityStatus();
    alert(`Goddess KAREENA has locked you: ${lockType} lock until ${new Date(releaseDate).toLocaleString()}`);
  });

  // Initial load
  await getChastityStatus();
}
