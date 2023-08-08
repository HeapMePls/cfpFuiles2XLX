frappe._messages['Admitted'] = 'Internado';
frappe._messages['Discharge Scheduled'] = 'Alta esperada';
frappe._messages['Discharged'] = 'Alta';

frappe.listview_settings['Patient'] = {
  refresh: function(listview) {
     // Hide name filter from Listview
      $("div[data-fieldname = name]").hide();
  },
  // Hide name from Listview
 hide_name_column: true
};