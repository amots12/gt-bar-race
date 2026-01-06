/* ============================================================
   Tour de France – GC Bar Chart Race
   ============================================================ */

   const chart = echarts.init(document.getElementById("chart"));

   const RACE = "tdf";
   const YEAR = 2023;
   const TOTAL_STAGES = 21;
   const PLAY_INTERVAL = 1000;
   
   // ------------------------------------------------------------
   // Utilities
   // ------------------------------------------------------------
   
   function secondsToHMS(sec) {
     const h = Math.floor(sec / 3600);
     const m = Math.floor((sec % 3600) / 60);
     const s = sec % 60;
     return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
   }
   
   // ------------------------------------------------------------
   // Load data
   // ------------------------------------------------------------
   
   async function loadAllStages() {
     const stages = [];
   
     for (let i = 1; i <= TOTAL_STAGES; i++) {
       const s = String(i).padStart(2, "0");
       const res = await fetch(`data/${RACE}/${YEAR}/stage_${s}.json`);
       stages.push(await res.json());
     }
   
     return stages;
   }
   
   // ------------------------------------------------------------
   // Init chart
   // ------------------------------------------------------------
   
   loadAllStages().then(stages => {
     // Global max GC time (freeze x-axis forever)
     const MAX_TIME = Math.max(
       ...stages.flat().map(d => d.acc_seconds)
     );
   
     chart.setOption({
       timeline: {
         axisType: "category",
         autoPlay: true,
         playInterval: PLAY_INTERVAL,
         show: false,
         data: stages.map((_, i) => `S${i + 1}`)
       },
   
       title: {
         text: `Tour de France ${YEAR}`,
         subtext: "General Classification",
         left: "center",
         top: 20,
         textStyle: {
           fontSize: 20,
           fontWeight: 600
         },
         subtextStyle: {
           fontSize: 13,
           color: "#666"
         }
       },
   
       grid: {
         left: 220,
         right: 90,
         top: 90,
         bottom: 40
       },
   
       xAxis: {
         type: "value",
         max: MAX_TIME * 1.05,
         axisLabel: {
           formatter: v => {
             const h = Math.floor(v / 3600);
             const m = Math.floor((v % 3600) / 60);
             return `${h}h ${m}m`;
           }
         },
         splitLine: {
           lineStyle: { color: "#eee" }
         }
       },
   
       yAxis: {
         type: "category",
         inverse: true,
         axisLabel: {
           fontSize: 13,
           color: "#111"
         },
         animationDuration: 300,
         animationDurationUpdate: 300
       },
   
       series: [
         {
           type: "bar",
           realtimeSort: true,
           barWidth: 20,
   
           label: {
             show: true,
             position: "right",
             fontSize: 12,
             formatter: p => p.data.gc_time
           },
   
           itemStyle: {
             color: p =>
               p.data.rank === 1
                 ? "#f2c94c"   // yellow jersey
                 : "#5470c6"
           },
   
           animationDuration: 1200,
           animationDurationUpdate: 1200,
           animationEasing: "cubicOut",
           animationEasingUpdate: "cubicOut"
         }
       ],
   
       // --------------------------------------------------------
       // Timeline frames (one per stage)
       // --------------------------------------------------------
   
       options: stages.map((stageData, idx) => ({
         title: {
           subtext: `General Classification — After Stage ${idx + 1}`
         },
   
         yAxis: {
           data: stageData.map(d => d.rider)
         },
   
         series: [
           {
             data: stageData.map(d => ({
               value: d.acc_seconds,
               gc_time: d.overall_time || secondsToHMS(d.acc_seconds),
               rank: d.rank
             }))
           }
         ]
       }))
     });
   });
   