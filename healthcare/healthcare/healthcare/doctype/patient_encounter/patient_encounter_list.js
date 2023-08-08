/*
(c) ESS 2015-16
*/
frappe.listview_settings['Patient Encounter'] = {
	filters:[["docstatus","!=","2"]]
};

frappe.listview_settings['Patient Encounter'] = {
  refresh: function(listview) {
     // Hide name filter from Listview
      $("div[data-fieldname = name]").hide();
  },
  // Hide name from Listview
 hide_name_column: true
};