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

    // Se agrega un minimo timeout porque tarda en renderizar los campos
    setTimeout(() => {
      applyRowStyles();
    }, 100);
  },
  before_render: () => {
    // Agrego este evento tambien porque hay veces que se llama despues de onload
    setTimeout(() => {
      applyRowStyles();
    }, 100)
  }
}

function applyRowStyles() {
  const rows = document.getElementsByClassName("list-row");
  const backgroundColors = {
    Amarillo: "yellow",
    Rojo: "red",
    Verde: "green",
  };

  for (let element of rows) {
    // Agarro la columna que tiene el color con el texto
    const columnaColor = element.getElementsByClassName("list-row-col")[2];
    const color = columnaColor.innerText; // Saco el color

    const pill = element.getElementsByClassName('indicator-pill')[0];
    pill.classList.remove('gray');
    if (backgroundColors[color]) {
      pill.classList.add(backgroundColors[color]);
    }
  }
}
