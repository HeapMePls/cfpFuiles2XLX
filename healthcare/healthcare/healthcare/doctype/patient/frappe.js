frappe.listview_settings["Inpatient Record"] = {
  filters: [["status", "not in", ["Discharged"]]],
  get_indicator: function (doc) {
    // Esta función get_indicator no se utilizará en este caso
  },
  hide_name_column: true,
  hide_identificador: true,
  hide_filter: true,
  onload: function (listview) {
    listview.page.add_inner_button(__("Exportar"), function () {
      window.location.href = "https://cfp.bambus.cloud/app/data-export/Data%20Export";
    });

    setTimeout(() => {
      applyRowStyles();
    }, 100)
  },
};

function applyRowStyles() {
  const rows = document.getElementsByClassName("list-row");
  const colores = {
    Amarillo: "yellow",
    Rojo: "red",
    Verde: "green",
  };

  for (let element of rows) {
    const columnaColor = element.getElementsByClassName("list-row-col")[2];
    const color = columnaColor.innerText;
    const pill = element.getElementsByClassName('indicator-pill')[0];
    pill.style.backgroundColor = colores[color] || "transparent";
  }
}
