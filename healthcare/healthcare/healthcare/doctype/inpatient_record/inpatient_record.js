// Copyright (c) 2018, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt
frappe._messages['Admitted'] = 'Internado';
frappe._messages['Discharge Scheduled'] = 'Alta esperada';
frappe._messages['Discharged'] = 'Alta';
frappe.ui.form.on('Inpatient Record', {
  onload: function(frm) {
    // Oculta el campo de fecha al cargar el formulario
    frm.fields_dict['drug_prescription'].grid.wrapper.find('.row-index').hide();
    frm.fields_dict['medication_orders2'].grid.wrapper.find('.row-index').hide();
    frm.fields_dict['drug_prescription'].grid.wrapper.find('.grid-add-row').hide();
    frm.fields_dict['medication_orders2'].grid.wrapper.find('.grid-add-row').hide();
  },


  drug_prescription : function(frm){
    frm.fields_dict['drug_prescription'].grid.wrapper.find('.row-index').hide();
    frm.fields_dict['medication_orders2'].grid.wrapper.find('.row-index').hide();
    frm.fields_dict['drug_prescription'].grid.wrapper.find('.grid-add-row').hide();
    frm.fields_dict['medication_orders2'].grid.wrapper.find('.grid-add-row').hide();

  },
  medication_orders2: function(frm) {
    frm.fields_dict['drug_prescription'].grid.wrapper.find('.row-index').hide();
    frm.fields_dict['drug_prescription'].grid.wrapper.find('.grid-add-row').hide();
    frm.fields_dict['medication_orders2'].grid.wrapper.find('.row-index').css('display', 'none');
    frm.fields_dict['medication_orders2'].grid.wrapper.find('.grid-add-row').css('display', 'none');

  },

  alergico: function(frm) {
    // Obtiene el valor actual del campo de verificación
    var checkField = frm.doc.alergico;
    // Muestra u oculta el campo de fecha según el valor del campo de verificación
    toggleDateField(checkField);
  },

  diabetes: function(frm) {
    // Obtiene el valor actual del campo de verificación
    var checkField2 = frm.doc.diabetes;
    // Muestra u oculta el campo de fecha según el valor del campo de verificación
    toggleDateField2(checkField2);
  },


	setup: function(frm) {
		frm.get_field('drug_prescription').grid.editable_fields = [
			{fieldname: 'motivo', columns: 2},
			{fieldname: 'drug_code', columns: 2},
			{fieldname: 'dosage_form', columns: 2},
			{fieldname: 'dosage', columns: 2},
			{fieldname: 'period', columns: 2}
		];
    frm.get_field('medication_orders2').grid.editable_fields = [
      {fieldname: 'motivo', columns: 1},
			{fieldname: 'drug', columns: 2},
      {fieldname: 'dosage_form', columns: 2},
			{fieldname: 'date', columns: 1},
			{fieldname: 'time', columns: 1},
      {fieldname: 'medicacion_entregada', columns: 1},
      {fieldname: 'observaciones', columns: 2}


		];
	},

	refresh: function(frm) {
    frm.fields_dict['drug_prescription'].grid.get_field('suspender_medicacion').get_query = function(doc, cdt, cdn) {
      var child = locals[cdt][cdn];
      console.log('Boton haciendo click')
      return {
          "method": "healthcare.healthcare.doctype.inpatient_record.inpatient_record.suspend_medication", // Reemplaza con la ruta correcta de tu función
          "args": {
              "docname": doc.name,
              "suspension_date": child.date // Pasa la fecha de la entrada actual
          }
      };
  };
    frm.fields_dict['observaciones_'].grid.wrapper.find('.btn-open-row').hide();
    frm.fields_dict['observaciones_'].grid.wrapper.find('.grid-delete-row').hide();
    frm.fields_dict['observaciones_'].grid.wrapper.find('.grid-remove-rows').hide();
		frm.fields_dict['registro_médico'].grid.wrapper.find('.btn-open-row').hide();
    frm.fields_dict['registro_médico'].grid.wrapper.find('.grid-delete-row').hide();
    frm.fields_dict['registro_médico'].grid.wrapper.find('.grid-remove-rows').hide();
    frm.fields_dict['drug_prescription'].grid.wrapper.find('.row-index').hide();
		frm.fields_dict['drug_prescription'].grid.wrapper.find('.grid-add-row').hide();
    frm.fields_dict['medication_orders2'].grid.wrapper.find('.row-index').hide();
    frm.fields_dict['medication_orders2'].grid.wrapper.find('.grid-add-row').hide();
    frm.events.show_medication_order_button(frm);

		frm.set_query('admission_service_unit_type', function() {
			return {
				filters: {
					'inpatient_occupancy': 1,
					'allow_appointments': 0
				}
			};
		});

    if (frappe.user.has_role('Physician')) {
      frm.set_df_property('observaciones_', 'read_only', 1);
    }
    if (frappe.user.has_role('Nursing User')) {
      frm.set_df_property('registro_médico', 'read_only', 1);
    }

		frm.set_query('primary_practitioner', function() {
			return {
				filters: {
					'department': frm.doc.medical_department
				}
			};
		});
    
    if (!frm.doc.__islocal && frappe.user.has_role('physician')) {
      frm.add_custom_button(__('Registro médico'), function() {
        create_observacion(frm);
      }, "Agregar");
    }

   var create_observacion = function (frm) { 
    frappe.route_options = {
      "patient": frm.doc.patient_name,
      "status": "Open",
      "reference_doctype": "Patient Medical Record",
      "reference_owner": frm.doc.owner
    };
    frappe.new_doc("Patient Medical Record");
  };

  if (!frm.doc.__islocal) {
    if (frm.doc.status == 'Admitted') {
        frm.add_custom_button(__('Programar Alta'), function() {
            schedule_discharge(frm);
        });
        frm.add_custom_button(__('Ver historia clínica'), function() {
            frappe.route_options = {'patient': frm.doc.patient_name};
            frappe.set_route('patient_history');
        });
    } else if (frm.doc.status == 'Admission Scheduled') {
        frm.add_custom_button(__('Cancelar Admisión'), function() {
            cancel_ip_order(frm);
        });
        frm.add_custom_button(__('Admitir'), function() {
            admit_patient_dialog(frm);
        });
    } else if (frm.doc.status == 'Discharge Scheduled' && frappe.user.has_role('Nursing User')) {
        frm.add_custom_button(__('Alta del Paciente'), function() {
            discharge_patient(frm);
        });
        frm.add_custom_button(__('Volver a Internar'), function() {
          cancel_discharge(frm);
      });
      }
    }
},

btn_transfer: function(frm) {
    transfer_patient_dialog(frm);
},

show_medication_order_button: function(frm) {
  frm.fields_dict['drug_prescription'].grid.wrapper.find('.grid-add-row').hide();
  frm.fields_dict['drug_prescription'].grid.add_custom_button(__('Agregar orden de medicación'), () => {
    let d = new frappe.ui.Dialog({
      title: __('Agregar oden de medicación'),
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
          fieldname: 'motivo',
          label: __('Motivo'),
          fieldtype: 'Select',
          options: "Orden de medicaci\u00f3n\nSND - Si no duerme\nSEE - Si est\u00e1 excitado\nSEA - Si est\u00e1 ansioso",
          reqd: 1
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
        d.hide();
        if (values.period === '1000 Week') {
          frm.call({
            doc: frm.doc,
            method: 'add_order_entries_admitted',
            args: {
              order: values
            },
            freeze: true,
            freeze_message: __('Adding Order Entries'),
            callback: function() {
              frm.refresh_field('medication_orders');
            }
          });
        } else {
          frm.add_child('drug_prescription', {
            motivo: values.motivo,
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

  /*validate: async function(frm) {
		var admission_scheduled_count = await frappe.db.count("Inpatient Record", {
			filters: {
				status: "Admission Scheduled",
			},
			fields: ["status"],
		});

		console.log(admission_scheduled_count);

		var admitted_count = await frappe.db.count("Inpatient Record", {
			filters: {
				status: "Admitted",
			},
			fields: ["status"],
		});

		console.log(admitted_count);

		var total_count = admission_scheduled_count + admitted_count;
		console.log(total_count);
		if (total_count > 45) {
			frappe.throw('No hay camas disponibles.');
		}
	},*/
});

function toggleDateField(checkField) {
   // Obtén una referencia al campo de fecha
   var dateField = cur_frm.fields_dict.tipo_de_alergia.wrapper;
  
   // Muestra u oculta el campo de fecha según el valor del campo de verificación
   if (checkField) {
       dateField.style.display = "";
   } else {
       dateField.style.display = "none";
   }
}

function toggleDateField2(checkField2) {
    // Obtén una referencia al campo de fecha
    var dateField2 = cur_frm.fields_dict.tipo_de_diabetes.wrapper;
    // Muestra u oculta el campo de fecha según el valor del campo de verificación
    if (checkField2) {
        dateField2.style.display = "";
    } else {
        dateField2.style.display = "none";
    }
}


let discharge_patient = function(frm) {
	let dialog = new frappe.ui.Dialog({
		  title: 'Alta del Paciente',
		  width: 100,
      fields: [
        {
          fieldtype: 'Link',
          label: 'Médico que ordena el alta',
          fieldname: 'discharge_practitioner',
          options: 'Healthcare Practitioner',
          read_only: 1,
          default: frm.doc.discharge_practitioner
        },
        {
          fieldtype: 'Datetime',
          label: 'Fecha de alta',
          fieldname: 'discharge_ordered_datetime',
          read_only:1,
          default: frappe.datetime.now_datetime()
        },
        /*{
          fieldtype: 'Date',
          label: 'Followup Date',
          fieldname: 'followup_date'
        },*/
        {
          fieldtype: 'Column Break'
        },
        {
          fieldtype: 'Small Text',
          label: 'Hitos del Alta',
          fieldname: 'discharge_instructions',
          hidden: !frappe.user.has_role('Nursing User'),
          reqd: frappe.user.has_role('Nursing User') ? 1 : 0,
          default: frm.doc.paciente_pertenencias
        },
        {
          fieldtype: 'Section Break',
          label:'Resumen de Alta'
        },
        {
          fieldtype: 'Long Text',
          label: 'Nota de alta',
          fieldname: 'discharge_note',
          read_only: 1,
          default: frm.doc.discharge_note

        }
      ],
		primary_action_label: __('Alta del Paciente'),
		primary_action : function(){
      let discharge_practitioner = dialog.get_value('discharge_practitioner');
      let discharge_ordered_datetime = dialog.get_value('discharge_ordered_datetime');
      let discharge_instructions = dialog.get_value('discharge_instructions');
      let discharge_note = dialog.get_value('discharge_note');
			frappe.call({
				doc: frm.doc,
				method: 'discharge',
        args:{
          discharge_practitioner: frm.doc.discharge_practitioner,
          discharge_ordered_datetime: frm.doc.discharge_ordered_datetime,
          discharge_instructions: frm.doc.discharge_instruction,
          discharge_note: frm.doc.discharge_note
				},
				callback: function(data) {
				if (!data.exc) {
					frm.reload_doc();
				}
				},
				freeze: true,
        freeze_message: 'Paciente dado de alta'
      });
      frm.refresh_fields();
      dialog.hide();
    }
  });

	dialog.show();
	dialog.$wrapper.find('.modal-dialog').css('width', '800px');
};

let admit_patient_dialog = function(frm) {
  //let gender_value = frm.doc.gender;
	let dialog = new frappe.ui.Dialog({
    title: "Admitir Paciente",
    width: 100,
    fields: [
      { fieldtype: "Data", label: "Género del paciente", fieldname: "gender", hidden: 1 },
      { fieldtype: "Link", label: "Tipo de Unidad", fieldname: "service_unit_type", options: "Healthcare Service Unit Type" },
      { fieldtype: "Link", label: "Habitación", fieldname: "service_unit", options: "Healthcare Service Unit", reqd: 1 },
      { fieldtype: "Datetime", label: "Fecha y hora de admitido", fieldname: "check_in", reqd: 1, default: frappe.datetime.now_datetime() },
      { fieldtype: "Link", label: "Medico tratante", fieldname: "primary_practitioner", options: "Healthcare Practitioner", reqd: 1 },
      { fieldtype: "Small Text", label: "Pertenencias del paciente", fieldname: "paciente_pertenencias", reqd: 1 },
      { fieldtype: "Attach", label: "Orden médica", fieldname: "orden_medica", reqd: 1 },
      { fieldtype: "Attach", label: "Indicaciones al ingreso", fieldname: "indicaciones_al_ingreso", reqd: 1 },
      //{fieldtype: "Table MultiSelect", label: "Motivo de ingreso", fieldname: "chief_complaint", options: "Patient Encounter Symptom", reqd: 1},
      //{fieldtype: "Table MultiSelect", label: "Diagnostico", fieldname: "diagnosis", options: "Patient Encounter Diagnosis", reqd: 1},
      /*{fieldtype: 'Date', label: 'Expected Discharge', fieldname: 'expected_discharge'
				default: frm.doc.expected_length_of_stay ? frappe.datetime.add_days(frappe.datetime.now_datetime(), frm.doc.expected_length_of_stay) : ''
			}*/
    ],
    primary_action_label: __("Admitir Paciente"),
    primary_action: function () {
      let service_unit = dialog.get_value("service_unit");
      let check_in = dialog.get_value("check_in");
      let primary_practitioner = dialog.get_value("primary_practitioner");
      let paciente_pertenencias = dialog.get_value("paciente_pertenencias");
      let orden_medica = dialog.get_value("orden_medica");
      let indicaciones_al_ingreso = dialog.get_value("indicaciones_al_ingreso");
      //let chief_complaint = dialog.get_value('chief_complaint');
      //let diagnosis = dialog.get_value('diagnosis');
      let expected_discharge = null;
      if (dialog.get_value("expected_discharge")) {
        expected_discharge = dialog.get_value("expected_discharge");
      }
      if (!service_unit && !check_in) {
        return;
      }
      frappe.call({
        doc: frm.doc,
        method: "admit",
        args: {
          service_unit: service_unit,
          check_in: check_in,
          primary_practitioner: primary_practitioner,
          paciente_pertenencias: paciente_pertenencias,
          orden_medica: orden_medica,
          indicaciones_al_ingreso: indicaciones_al_ingreso,
          //'chief_complaint': chief_complaint,
          //'diagnosis': diagnosis,
          //'expected_discharge': expected_discharge
        },
        callback: function (data) {
          if (!data.exc) {
            frm.reload_doc();
            console.log("holaa3333333");
            const chiefComplaintIsEmpty = !frm.doc.mignreso;
            const diagnosisIsEmpty = !frm.doc.diagnostico_principal;

            if (chiefComplaintIsEmpty && diagnosisIsEmpty) {
              frappe.msgprint(__("Por favor, asegúrate de completar los campos Motivo de Ingreso y Diagnóstico."));
            } else if (chiefComplaintIsEmpty) {
              frappe.msgprint(__("No olvides cargar el campo Motivo de Ingreso."));
            } else if (diagnosisIsEmpty) {
              frappe.msgprint(__("No olvides cargar el campo Diagnóstico."));
            }
          }
        },
        freeze: true,
        freeze_message: __("Admitiendo Paciente"),
      });
      frm.refresh_fields();
      dialog.hide();
    },
  });
// Controlar las opciones de service_unit_type según el género seleccionado
if (frm.doc.gender) {
  dialog.set_value('gender', frm.doc.gender);
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
};

// Filtrar el campo "Habitación" (service_unit) según el "Tipo de Unidad" (service_unit_type)
dialog.fields_dict['service_unit'].get_query = function () {
  return {
    filters: {
      'is_group': 0,
      'company': frm.doc.company,
      'service_unit_type': dialog.get_value('service_unit_type'),
      'occupancy_status': 'Vacant'
    }
  };
};

dialog.show();
};



let transfer_patient_dialog = function(frm) {
	let dialog = new frappe.ui.Dialog({
		title: 'Cambiar Habitación',
		width: 100,
		fields: [
      { fieldtype: "Data", label: "Género del paciente", fieldname: "gender", hidden: 1},
			{fieldtype: 'Link', label: 'Cama actual', fieldname: 'leave_from', options: 'Healthcare Service Unit', reqd: 1, read_only:1},
			{fieldtype: 'Link', label: 'Tipo de Unidad', fieldname: 'service_unit_type', options: 'Healthcare Service Unit Type'},
			{fieldtype: 'Link', label: 'Proxima cama', fieldname: 'service_unit', options: 'Healthcare Service Unit', reqd: 1},
			{fieldtype: 'Datetime', label: 'Ingreso', fieldname: 'check_in', reqd: 1, default: frappe.datetime.now_datetime()}
		],
		primary_action_label: __('Cambiar Habitación'),
		primary_action : function() {
			let service_unit = null;
			let check_in = dialog.get_value('check_in');
			let leave_from = null;
			if(dialog.get_value('leave_from')){
				leave_from = dialog.get_value('leave_from');
			}
			if(dialog.get_value('service_unit')){
				service_unit = dialog.get_value('service_unit');
			}
			if(check_in > frappe.datetime.now_datetime()){
				frappe.msgprint({
					title: __('Not Allowed'),
					message: __('Check-in time cannot be greater than the current time'),
					indicator: 'red'
				});
				return;
			}
			frappe.call({
				doc: frm.doc,
				method: 'transfer',
				args:{
					'service_unit': service_unit,
					'check_in': check_in,
					'leave_from': leave_from
				},
				callback: function(data) {
					if (!data.exc) {
						frm.reload_doc();
					}
				},
				freeze: true,
				freeze_message: __('Process Transfer')
			});
			frm.refresh_fields();
			dialog.hide();
		}
	});

	dialog.fields_dict['leave_from'].get_query = function(){
		return {
			query : 'healthcare.healthcare.doctype.inpatient_record.inpatient_record.get_leave_from',
			filters: {docname:frm.doc.name}
		};
	};
	dialog.fields_dict['service_unit_type'].get_query = function(){
		return {
			filters: {
				'inpatient_occupancy': 1,
				'allow_appointments': 0
			}
		};
	};
  if (frm.doc.gender) {
    dialog.set_value('gender', frm.doc.gender);
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
  };
	dialog.fields_dict['service_unit'].get_query = function(){
		return {
			filters: {
				'is_group': 0,
				'service_unit_type': dialog.get_value('service_unit_type'),
				'occupancy_status' : 'Vacant'
			}
		};
	};

	dialog.show();

	let not_left_service_unit = null;
	for (let inpatient_occupancy in frm.doc.inpatient_occupancies) {
		if (frm.doc.inpatient_occupancies[inpatient_occupancy].left != 1) {
			not_left_service_unit = frm.doc.inpatient_occupancies[inpatient_occupancy].service_unit;
		}
	}
	dialog.set_values({
		'leave_from': not_left_service_unit
	});
};

var schedule_discharge = function(frm) {
  console.log('hola')
  var defaultPractitioner = frappe.user.has_role('Physician') ? frappe.session.user : '';

  var dialog = new frappe.ui.Dialog({
    title: 'Programar Alta',
    fields: [
      {
        fieldtype: 'Link',
        label: 'Médico que ordena el alta',
        fieldname: 'discharge_practitioner',
        options: 'Healthcare Practitioner',
        reqd: 1,
        default: defaultPractitioner // Set the default value

      },
      {
        fieldtype: 'Datetime',
        label: 'Fecha de alta',
        fieldname: 'discharge_ordered_datetime',
        default: frappe.datetime.now_datetime()
      },
      /*{
        fieldtype: 'Date',
        label: 'Followup Date',
        fieldname: 'followup_date'
      },*/
      {
        fieldtype: 'Column Break'
      },
      /*{
        fieldtype: 'Small Text',
        label: 'Hitos del Alta',
        fieldname: 'discharge_instructions',
        hidden: !frappe.user.has_role('Nursing User'),
        reqd: frappe.user.has_role('Nursing User') ? 1 : 0
      },*/
      {
        fieldtype: 'Section Break',
        label:'Resumen de Alta'
      },
      {
        fieldtype: 'Long Text',
        label: 'Nota de alta',
        fieldname: 'discharge_note'
      }
    ],
    primary_action_label: __('Programar Alta'),
    primary_action: function() {
      var args = {
        patient: frm.doc.patient,
        discharge_practitioner: dialog.get_value('discharge_practitioner'),
        discharge_ordered_datetime: dialog.get_value('discharge_ordered_datetime'),
        followup_date: dialog.get_value('followup_date'),
        //discharge_instructions: dialog.get_value('discharge_instructions'),
        discharge_note: dialog.get_value('discharge_note')
      }
      //var dischargePractitioner = frm.doc.discharge_practitioner;
      //var dischargeNote = frm.doc.discharge_note;

      frappe.call({
        method: 'healthcare.healthcare.doctype.inpatient_record.inpatient_record.schedule_discharge',
        args: {args},
        callback: function(data) {
          if (!data.exc) {
            frm.reload_doc();
          }
        },
        freeze: true,
        freeze_message: 'Programando Alta'
      });
      frm.refresh_fields();
      dialog.hide();
    }
  });
  
  dialog.show();
	dialog.$wrapper.find('.modal-dialog').css('width', '800px');
};

let cancel_ip_order = function(frm) {
  frappe.call({
      method: 'healthcare.healthcare.doctype.inpatient_record.inpatient_record.set_ip_order_cancelled',
      async: false,
      freeze: true,
      args: {
          inpatient_record: frm.doc.name
      },
      callback: function(r) {
          if (!r.exc) {
              frm.reload_doc();
          }
      }
  });
};

let cancel_discharge = function(frm) {
  frappe.call({
      method: 'healthcare.healthcare.doctype.inpatient_record.inpatient_record.cancelled_discharge',
      async: false,
      freeze: true,
      args: {
          inpatient_record: frm.doc.name
      },
      callback: function(r) {
          if (!r.exc) {
              frm.reload_doc();
          }
      }
  });
}

