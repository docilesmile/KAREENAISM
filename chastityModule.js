export async function loadChastityModule(supabase) {
  const modulesContainer = document.getElementById("modulesContainer");
  const chastityDiv = document.createElement("div");
  chastityDiv.id="chastityModule";
  chastityDiv.innerHTML = `<h2>Chastity Status</h2><p id="chastityStatus">Loading...</p>`;
  modulesContainer.appendChild(chastityDiv);
  const statusP = document.getElementById("chastityStatus");

  const HOLY_DAYS=[
    {name:"Goddess KAREENA Birthday", month:9, day:21, minDays:7,maxDays:7},
    ...Array.from({length:7},(_,i)=>({name:"Birthday Week", month:9, day:14+i, minDays:1,maxDays:2}))
  ];

  async function getChastityStatus(){
    if(!window.currentUser) return;
    const { data } = await supabase.from("chastityStatus").select("*").eq("user_id",window.currentUser.id).order("created_at",{ascending:false}).limit(1);
    if(!data || data.length===0){ statusP.innerText="You are not locked."; return; }
    const latest = data[0];
    const now = new Date(), release=new Date(latest.release_date);
    if(latest.is_locked && release>now){
      const rem = release-now;
      statusP.innerText=`Locked until ${release.toLocaleString()}.`;
    } else statusP.innerText="You are not locked.";
  }

  window.reduceTimeForTask=async function(minutes){
    if(!window.currentUser) return;
    const { data } = await supabase.from("chastityStatus").select("*").eq("user_id",window.currentUser.id).order("created_at",{ascending:false}).limit(1);
    if(!data || data.length===0) return;
    const latest = data[0]; if(!latest.is_locked) return;
    const newRelease=new Date(new Date(latest.release_date).getTime()-minutes*60*1000);
    await supabase.from("chastityStatus").update({release_date:newRelease}).eq("id",latest.id);
    getChastityStatus();
  };

  async function lockChastity(userId, durationDays, source="Goddess KAREENA"){
    const releaseDate=new Date();
    releaseDate.setDate(releaseDate.getDate()+durationDays);
    await supabase.from("chastityStatus").upsert({user_id:userId,is_locked:true,release_date:releaseDate,source});
    getChastityStatus();
  }

  async function dailyReset(){
    if(!window.currentUser) return;
    const userId=window.currentUser.id;
    const today=new Date();
    const dayKey=today.toISOString().split("T")[0];

    // 1. Task penalties
    const { data: tasks } = await supabase.from("rolled_tasks").select("*").eq("user_id",userId).eq("day_key",dayKey).eq("done",false);
    if(tasks && tasks.length>0){
      for(const task of tasks){
        let penalty=0;
        if(task.difficulty==="Easy") penalty=60;
        else if(task.difficulty==="Medium") penalty=120;
        else if(task.difficulty==="Hard") penalty=300;
        await window.reduceTimeForTask(-penalty); // add time
      }
    }

    // 2. Holy Days
    const month=today.getMonth()+1, day=today.getDate();
    const holyToday=HOLY_DAYS.filter(d=>d.month===month && d.day===day);
    if(holyToday.length>0){
      const { data: status } = await supabase.from("chastityStatus").select("*").eq("user_id",userId).order("created_at",{ascending:false}).limit(1);
      if(!status || status.length===0 || !status[0].is_locked){
        const holy=holyToday[0];
        const duration=holy.minDays+Math.random()*(holy.maxDays-holy.minDays);
        await lockChastity(userId,duration,`Holy Day: ${holy.name}`);
      }
    }

    // 3. Clear today's rolled tasks
    await supabase.from("rolled_tasks").delete().eq("user_id",userId).eq("day_key",dayKey);
  }

  // schedule daily reset at 4AM
  function scheduleDailyReset(){
    const now=new Date();
    const next4=new Date(); next4.setHours(4,0,0,0);
    if(now>=next4) next4.setDate(next4.getDate()+1);
    setTimeout(async ()=>{
      await dailyReset();
      scheduleDailyReset();
    }, next4-now);
  }
  scheduleDailyReset();

  await getChastityStatus();
  setInterval(getChastityStatus,60000);
  window.attemptBegRelease=async function(){ alert("Goddess may consider releasing you."); };
}
