// Copyright (c) 2016, ESS LLP and contributors
// For license information, please see license.txt

frappe.ui.form.on('Patient Encounter', {
	onload: function(frm) {
		if (!frm.doc.__islocal && frm.doc.docstatus === 1 &&
			frm.doc.inpatient_status == 'Admission Scheduled') {
				frappe.db.get_value('Inpatient Record', frm.doc.inpatient_record,
					['admission_encounter', 'status']).then(r => {
						if (r.message) {
							if (r.message.admission_encounter == frm.doc.name &&
								r.message.status == 'Admission Scheduled') {
									frm.add_custom_button(__('Cancel Admission'), function() {
										cancel_ip_order(frm);
									});
								}
							if (r.message.status == 'Admitted') {
								frm.add_custom_button(__('Schedule Discharge'), function() {
									schedule_discharge(frm);
								});
							}
						}
				})
		}
	},

	setup: function(frm) {
		frm.get_field('therapies').grid.editable_fields = [
			{fieldname: 'therapy_type', columns: 8},
			{fieldname: 'no_of_sessions', columns: 2}
		];
		frm.get_field('drug_prescription').grid.editable_fields = [
			{fieldname: 'drug_code', columns: 2},
			{fieldname: 'dosage_form', columns: 2},
			{fieldname: 'dosage', columns: 2},
			{fieldname: 'period', columns: 2}
		];
		frm.get_field('lab_test_prescription').grid.editable_fields = [
			{fieldname: 'lab_test_code', columns: 2},
			{fieldname: 'lab_test_name', columns: 4},
			{fieldname: 'lab_test_comment', columns: 4}
		];
	},

	refresh: function(frm) {
		refresh_field('drug_prescription');
		refresh_field('lab_test_prescription');
    frm.events.show_medication_order_button(frm);


		if (!frm.doc.__islocal) {
			if (frm.doc.docstatus === 1) {
				if(!['Discharge Scheduled', 'Admission Scheduled', 'Admitted'].includes(frm.doc.inpatient_status)) {
					frm.add_custom_button(__('Schedule Admission'), function() {
						schedule_inpatient(frm);
					});
				}
			}
      if (frappe.user.has_role('Administrator')) {
			frm.add_custom_button(__('Patient History'), function() {
				if (frm.doc.patient) {
					frappe.route_options = {'patient': frm.doc.patient};
					frappe.set_route('patient_history');
				} else {
					frappe.msgprint(__('Please select Patient'));
				}
			},__('View'));

			frm.add_custom_button(__('Vital Signs'), function() {
				create_vital_signs(frm);
			},__('Create'));

			/*frm.add_custom_button(__('Medical Record'), function() {
				create_medical_record(frm);
			},__('Create'));*/

			frm.add_custom_button(__('Clinical Procedure'), function() {
				create_procedure(frm);
			},__('Create'));

			if (frm.doc.drug_prescription && frm.doc.inpatient_record && frm.doc.inpatient_status === "Admitted") {
				frm.add_custom_button(__('Inpatient Medication Order'), function() {
					frappe.model.open_mapped_doc({
						method: 'healthcare.healthcare.doctype.patient_encounter.patient_encounter.make_ip_medication_order',
						frm: frm
					});
				},__('Create'));
			}

			frm.add_custom_button(__('Nursing Tasks'), function() {
				create_nursing_tasks(frm);
			},__('Create'));
		}
  }
		frm.set_query('patient', function() {
			return {
				filters: {'status': 'Active'}
			};
		});

		frm.set_query('drug_code', 'drug_prescription', function() {
			return {
				filters: {
					is_stock_item: 1
				}
			};
		});

		frm.set_query('lab_test_code', 'lab_test_prescription', function() {
			return {
				filters: {
					is_billable: 1
				}
			};
		});

		frm.set_query('appointment', function() {
			return {
				filters: {
					//	Scheduled filter for demo ...
					status:['in',['Open','Scheduled']]
				}
			};
		});

		frm.set_query("medical_code", "codification_table", function(doc, cdt, cdn) {
			let row = frappe.get_doc(cdt, cdn);
			if (row.medical_code_standard) {
				return {
					filters: {
						medical_code_standard: row.medical_code_standard
					}
				};
			}
		});

		frm.set_df_property('patient', 'read_only', frm.doc.appointment ? 1 : 0);

		if (frm.doc.google_meet_link && frappe.datetime.now_date() <= frm.doc.encounter_date) {
			frm.dashboard.set_headline(
				__("Join video conference with {0}", [
					`<a target='_blank' href='${frm.doc.google_meet_link}'>Google Meet</a>`,
				])
			);
		}
	},
  show_medication_order_button: function(frm) {
    frm.fields_dict['drug_prescription'].grid.wrapper.find('.grid-add-row').hide();
    frm.fields_dict['drug_prescription'].grid.add_custom_button(__('Add Medication Orders'), () => {
      let d = new frappe.ui.Dialog({
        title: __('Add Medication Orders'),
        fields: [
          {
            fieldname: 'start_date',
            label: __('Start Date'),
            fieldtype: 'Date',
            default: frappe.datetime.get_today(),
            reqd: 1,
            onchange: () => {
              // Actualizar el campo start_date en el Doctype al cambiar en el diálogo
              frm.doc.start_date = d.get_value('start_date');
              frm.refresh_field('start_date');
              frappe.ui.form.save(frm.docname);
  
            }
          },
          {
            fieldname: 'drug_code',
            label: __('Drug'),
            fieldtype: 'Link',
            options: 'Item',
            reqd: 1,
            "get_query": function () {
              return {
                filters: {'is_stock_item': 1}
              };
            }
          },
          {
            fieldname: 'dosage',
            label: __('Dosage'),
            fieldtype: 'Link',
            options: 'Prescription Dosage',
            reqd: 1
          },
          {
            fieldname: 'period',
            label: __('Period'),
            fieldtype: 'Link',
            options: 'Prescription Duration',
            reqd: 1
          },
          {
            fieldname: 'dosage_form',
            label: __('Dosage Form'),
            fieldtype: 'Link',
            options: 'Item Group',
            reqd: 1
          }
        ],
        primary_action_label: __('Add'),
        primary_action: () => {
          let values = d.get_values();
          if (values) {
            d.hide();
            frm.add_child('drug_prescription', {
              drug_code: values.drug_code, // Reemplaza field1 con los nombres de tus campos
              drug_name: values.drug_name,
              dosage: values.dosage,
              period: values.period,
              dosage_form: values.dosage_form,
            });
  
            frm.refresh_field('drug_prescription');
            console.log('Dialog Values:', values); // Agrega este console.log para verificar los valores
  
            frm.call({
              doc: frm.doc,
              method: 'add_order_entries',
              args: {
                order: values
              },
              freeze: true,
              freeze_message: __('Adding Order Entries'),
              callback: function() {
                frm.refresh_field('medication_orders');
  
              }
            });
          }
        },
      });
      d.show();
    });
  },

	appointment: function(frm) {
		frm.events.set_appointment_fields(frm);
	},

	patient: function(frm) {
		frm.events.set_patient_info(frm);
	},

	practitioner: function(frm) {
		if (!frm.doc.practitioner) {
			frm.set_value('practitioner_name', '');
		}
	},
	set_appointment_fields: function(frm) {
		if (frm.doc.appointment) {
			frappe.call({
				method: 'frappe.client.get',
				args: {
					doctype: 'Patient Appointment',
					name: frm.doc.appointment
				},
				callback: function(data) {
					let values = {
						'patient':data.message.patient,
						'type': data.message.appointment_type,
						'practitioner': data.message.practitioner,
						'invoiced': data.message.invoiced,
						'company': data.message.company
					};
					frm.set_value(values);
					frm.set_df_property('patient', 'read_only', 1);
				}
			});
		}
		else {
			let values = {
				'patient': '',
				'patient_name': '',
				'type': '',
				'practitioner': '',
				'invoiced': 0,
				'patient_sex': '',
				'patient_age': '',
				'inpatient_record': '',
				'inpatient_status': ''
			};
			frm.set_value(values);
			frm.set_df_property('patient', 'read_only', 0);
		}
	},

	set_patient_info: function(frm) {
		if (frm.doc.patient) {
			frappe.call({
				method: 'healthcare.healthcare.doctype.patient.patient.get_patient_detail',
				args: {
					patient: frm.doc.patient
				},
				callback: function(data) {
					let age = '';
					if (data.message.dob) {
						age = calculate_age(data.message.dob);
					}
					let values = {
						'patient_age': age,
						'patient_name':data.message.patient_name,
						'patient_sex': data.message.sex,
						'inpatient_record': data.message.inpatient_record,
						'inpatient_status': data.message.inpatient_status
					};
					frm.set_value(values);
				}
			});
		} else {
			let values = {
				'patient_age': '',
				'patient_name':'',
				'patient_sex': '',
				'inpatient_record': '',
				'inpatient_status': ''
			};
			frm.set_value(values);
		}
	},

	get_applicable_treatment_plans: function(frm) {
		frappe.call({
			method: 'get_applicable_treatment_plans',
			doc: frm.doc,
			args: {'encounter': frm.doc},
			freeze: true,
			freeze_message: __('Fetching Treatment Plans'),
			callback: function() {
				new frappe.ui.form.MultiSelectDialog({
					doctype: "Treatment Plan Template",
					target: this.cur_frm,
					setters: {
						medical_department: "",
					},
					action(selections) {
						frappe.call({
							method: 'set_treatment_plans',
							doc: frm.doc,
							args: selections,
						}).then(() => {
							frm.refresh_field('drug_prescription');
							frm.refresh_field('procedure_prescription');
							frm.refresh_field('lab_test_prescription');
							frm.refresh_field('therapies');
						});
						cur_dialog.hide();
					}
				});


			}
		});
	},

});

var schedule_inpatient = function(frm) {
	var dialog = new frappe.ui.Dialog({
		title: 'Programar admisión',
		fields: [
      { fieldtype: "Data", label: "Género del paciente", fieldname: "gender", hidden: 1},

			//{fieldtype: 'Data', label: 'Medical Department', fieldname: 'medical_department', default: 'Psiquiatría'},
      //{fieldtype: 'Link', label: 'Service Unit Type', fieldname: 'service_unit_type', options: 'Healthcare Service Unit Type'},
			{fieldtype: 'Link', label: 'Healthcare Practitioner (Primary)', fieldname: 'primary_practitioner', options: 'Healthcare Practitioner', reqd: 1},
			//{fieldtype: 'Link', label: 'Healthcare Practitioner (Secondary)', fieldname: 'secondary_practitioner', options: 'Healthcare Practitioner'},
			//{fieldtype: 'Link', label: 'Nursing Checklist Template', fieldname: 'admission_nursing_checklist_template', options: 'Nursing Checklist Template'},
			{fieldtype: 'Column Break'},
			{fieldtype: 'Date', label: 'Admission Ordered For', fieldname: 'admission_ordered_for', default: 'Today'},
			//{fieldtype: 'Int', label: 'Expected Length of Stay', fieldname: 'expected_length_of_stay'},
			{fieldtype: 'Section Break'},
			{fieldtype: 'Long Text', label: 'Instrucciones para la admisión', fieldname: 'admission_instruction'}
		],
		primary_action_label: __('Reservar cama'),
		primary_action : function() {
			var args = {
				patient: frm.doc.patient,
				admission_encounter: frm.doc.name,
				referring_practitioner: frm.doc.practitioner,
				company: frm.doc.company,
				//medical_department: dialog.get_value('medical_department'),
				primary_practitioner: dialog.get_value('primary_practitioner'),
				//secondary_practitioner: dialog.get_value('secondary_practitioner'),
				admission_ordered_for: dialog.get_value('admission_ordered_for'),
				//admission_service_unit_type: dialog.get_value('service_unit_type'),
				//expected_length_of_stay: dialog.get_value('expected_length_of_stay'),
				admission_instruction: dialog.get_value('admission_instruction'),
				//admission_nursing_checklist_template: dialog.get_value('admission_nursing_checklist_template')
			}
			frappe.call({
				method: 'healthcare.healthcare.doctype.inpatient_record.inpatient_record.schedule_inpatient',
				args: {
					args: args
				},
				callback: function(data) {
					if (!data.exc) {
						frm.reload_doc();
					}
				},
				freeze: true,
				freeze_message: __('Reservando la cama')
			});
			frm.refresh_fields();
			dialog.hide();
		}
	});
  /*if (frm.doc.patient_sex) {
    dialog.set_value('gender', frm.doc.patient_sex);
  }
  
  // Controlar las opciones de service_unit_type según el género seleccionado
  dialog.fields_dict['gender'].df.onchange = function () {
    const gender = dialog.get_value('gender');
    let options = "";
  
    if (gender === 'Male') {
      options = "Hombres - Sector Adelante\nHombres - Sector Atras";
    } else if (gender === 'Female') {
      options = "Mujeres - Sector Adelante\nMujeres - Sector Atras";
    }
  
    dialog.fields_dict['service_unit_type'].get_query = function () {
      return {
        filters: {
          'name': ['in', options.split('\n')]
        }
      };
    };
  };*/

	dialog.set_values({
		'medical_department': frm.doc.medical_department,
		'primary_practitioner': frm.doc.practitioner,
	});

	/*dialog.fields_dict['service_unit_type'].get_query = function() {
		return {
			filters: {
				'inpatient_occupancy': 1,
				'allow_appointments': 0
			}
		};
	};*/

	dialog.show();
	dialog.$wrapper.find('.modal-dialog').css('width', '800px');
};


var schedule_discharge = function(frm) {
	var dialog = new frappe.ui.Dialog ({
		title: 'Inpatient Discharge',
		fields: [
			{fieldtype: 'Date', label: 'Discharge Ordered Date', fieldname: 'discharge_ordered_date', default: 'Today', read_only: 1},
			{fieldtype: 'Date', label: 'Followup Date', fieldname: 'followup_date'},
			{fieldtype: 'Link', label: 'Nursing Checklist Template', options: 'Nursing Checklist Template', fieldname: 'discharge_nursing_checklist_template'},
			{fieldtype: 'Column Break'},
			{fieldtype: 'Small Text', label: 'Discharge Instructions', fieldname: 'discharge_instructions'},
			{fieldtype: 'Section Break', label:'Discharge Summary'},
			{fieldtype: 'Long Text', label: 'Discharge Note', fieldname: 'discharge_note'}
		],
		primary_action_label: __('Order Discharge'),
		primary_action : function() {
			var args = {
				patient: frm.doc.patient,
				discharge_encounter: frm.doc.name,
				discharge_practitioner: frm.doc.practitioner,
				discharge_ordered_date: dialog.get_value('discharge_ordered_date'),
				followup_date: dialog.get_value('followup_date'),
				discharge_instructions: dialog.get_value('discharge_instructions'),
				discharge_note: dialog.get_value('discharge_note'),
				discharge_nursing_checklist_template: dialog.get_value('discharge_nursing_checklist_template')
			}
			frappe.call ({
				method: 'healthcare.healthcare.doctype.inpatient_record.inpatient_record.schedule_discharge',
				args: {args},
				callback: function(data) {
					if(!data.exc){
						frm.reload_doc();
					}
				},
				freeze: true,
				freeze_message: 'Scheduling Inpatient Discharge'
			});
			frm.refresh_fields();
			dialog.hide();
		}
	});

	dialog.show();
	dialog.$wrapper.find('.modal-dialog').css('width', '800px');
};

let create_medical_record = function(frm) {
	if (!frm.doc.patient) {
		frappe.throw(__('Please select patient'));
	}
	frappe.route_options = {
		'patient': frm.doc.patient,
		'status': 'Open',
		'reference_doctype': 'Patient Medical Record',
		'reference_owner': frm.doc.owner
	};
	frappe.new_doc('Patient Medical Record');
};

let create_vital_signs = function(frm) {
	if (!frm.doc.patient) {
		frappe.throw(__('Please select patient'));
	}
	frappe.route_options = {
		'patient': frm.doc.patient,
		'encounter': frm.doc.name,
		'company': frm.doc.company
	};
	frappe.new_doc('Vital Signs');
};

let create_procedure = function(frm) {
	if (!frm.doc.patient) {
		frappe.throw(__('Please select patient'));
	}
	frappe.route_options = {
		'patient': frm.doc.patient,
		'medical_department': frm.doc.medical_department,
		'company': frm.doc.company
	};
	frappe.new_doc('Clinical Procedure');
};

let create_nursing_tasks = function(frm) {
	const d = new frappe.ui.Dialog({

		title: __('Create Nursing Tasks'),

		fields: [
			{
				label: __('Nursing Checklist Template'),
				fieldtype: 'Link',
				options: 'Nursing Checklist Template',
				fieldname: 'template',
				reqd: 1,
			},
			{
				label: __('Start Time'),
				fieldtype: 'Datetime',
				fieldname: 'start_time',
				default: frappe.datetime.now_datetime(),
				reqd: 1,
			},
		],

		primary_action_label: __('Create Nursing Tasks'),

		primary_action: () => {

			let values = d.get_values();
			frappe.call({
				method: 'healthcare.healthcare.doctype.nursing_task.nursing_task.create_nursing_tasks_from_template',
				args: {
					'template': values.template,
					'doc': frm.doc,
					'start_time': values.start_time
				},
				callback: (r) => {
					if (r && !r.exc) {
						frappe.show_alert({
							message: __('Nursing Tasks Created'),
							indicator: 'success'
						});
					}
				}
			});

			d.hide();
		}
	});

	d.show();
};

frappe.ui.form.on('Drug Prescription', {
	dosage: function(frm, cdt, cdn){
		frappe.model.set_value(cdt, cdn, 'update_schedule', 1);
		let child = locals[cdt][cdn];
		if (child.dosage) {
			frappe.model.set_value(cdt, cdn, 'interval_uom', 'Day');
			frappe.model.set_value(cdt, cdn, 'interval', 1);
		}
	},
	period: function(frm, cdt, cdn) {
		frappe.model.set_value(cdt, cdn, 'update_schedule', 1);
	},
	interval_uom: function(frm, cdt, cdn) {
		frappe.model.set_value(cdt, cdn, 'update_schedule', 1);
		let child = locals[cdt][cdn];
		if (child.interval_uom == 'Hour') {
			frappe.model.set_value(cdt, cdn, 'dosage', null);
		}
	}
});

let calculate_age = function(birth) {
	let ageMS = Date.parse(Date()) - Date.parse(birth);
	let age = new Date();
	age.setTime(ageMS);
	let years =  age.getFullYear() - 1970;
	return `${years} ${__('Years(s)')} ${age.getMonth()} ${__('Month(s)')} ${age.getDate()} ${__('Day(s)')}`;
};

let cancel_ip_order = function(frm) {
	frappe.prompt([
		{
			fieldname: 'reason_for_cancellation',
			label: __('Reason for Cancellation'),
			fieldtype: 'Small Text',
			reqd: 1
		}
	],
	function(data) {
		frappe.call({
			method: 'healthcare.healthcare.doctype.inpatient_record.inpatient_record.set_ip_order_cancelled',
			async: false,
			freeze: true,
			args: {
				inpatient_record: frm.doc.inpatient_record,
				reason: data.reason_for_cancellation,
				encounter: frm.doc.name
			},
			callback: function(r) {
				if (!r.exc) {
					frm.reload_doc();
				}
			}
		});
	}, __('Reason for Cancellation'), __('Submit'));
}
