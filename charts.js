const chart = echarts.init(document.getElementById("chart"));

function renderStage(stageData) {
  // sort by rank (GC order)
  stageData.sort((a, b) => a.rank - b.rank);

  const riders = stageData.map(d => d.rider);
  const gaps = stageData.map(d => d.gap_seconds);

  const stageMeta = stageData[0];

  const option = {
    title: {
      text: `Stage ${stageMeta.stage} – ${stageMeta.stage_finish}`,
      subtext: `${stageMeta.stage_date} · ${stageMeta.stage_distance_km} km · ${stageMeta.stage_profile}`,
      left: "center"
    },

    grid: {
      left: 120,
      right: 40,
      top: 80,
      bottom: 40
    },

    xAxis: {
      type: "value",
      name: "Time gap (seconds)",
      axisLabel: {
        formatter: value => `${value}s`
      }
    },

    yAxis: {
      type: "category",
      inverse: true,
      data: riders
    },

    tooltip: {
      trigger: "item",
      formatter: params => {
        const d = stageData[params.dataIndex];
        return `
          <strong>${d.rider}</strong><br/>
          Team: ${d.team}<br/>
          Rank: ${d.rank}<br/>
          Gap: ${d.gap_seconds}s<br/>
          Overall time: ${d.overall_time}
        `;
      }
    },

    series: [
      {
        type: "bar",
        data: gaps,
        label: {
          show: true,
          position: "right",
          formatter: (p) => `${stageData[p.dataIndex].overall_time}`
        },
        animationDuration: 300,
        animationEasing: "linear"
      }
    ]
  };

  chart.setOption(option, true);
}
