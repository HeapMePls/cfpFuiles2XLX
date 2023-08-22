// Copyright (c) 2016, ESS LLP and contributors
// For license information, please see license.txt
{% include 'healthcare/regional/india/abdm/js/patient.js' %}

frappe._messages['Admitted'] = 'Internado';
frappe._messages['Discharge Scheduled'] = 'Alta esperada';
frappe._messages['Discharged'] = 'Alta';

frappe.ui.form.on('Patient', {

    validate: function (frm) {
        // Obtener el valor del campo Data (Texto)
        var campoData = frm.doc.first_name;
        var campoData2 = frm.doc.last_name;


        // Convertir la primera letra en mayúscula
        var campoDataMayuscula = campoData.charAt(0).toUpperCase() + campoData.slice(1);
        var campoDataMayuscula2 = campoData2.charAt(0).toUpperCase() + campoData2.slice(1);


        // Asignar el valor modificado al campo Data
        frappe.model.set_value(frm.doctype, frm.docname, 'first_name', campoDataMayuscula);
        frappe.model.set_value(frm.doctype, frm.docname, 'last_name', campoDataMayuscula2);

    },

	refresh: function (frm) {
		frm.set_query('patient', 'patient_relation', function () {
			return {
				filters: [
					['Patient', 'name', '!=', frm.doc.name]
				]
			};
		});
		frm.set_query('customer_group', {'is_group': 0});
		frm.set_query('default_price_list', { 'selling': 1});

		if (frappe.defaults.get_default('patient_name_by') != 'Naming Series') {
			frm.toggle_display('naming_series', false);
		} else {
			erpnext.toggle_naming_series();
		}

		if (frappe.defaults.get_default('collect_registration_fee') && frm.doc.status == 'Disabled') {
			frm.add_custom_button(__('Invoice Patient Registration'), function () {
				invoice_registration(frm);
			});
		}

		if (frm.doc.patient_name) {
      if ((frappe.user.has_role('Nursing User') || frappe.user.has_role('Physician'))) 
			frm.add_custom_button(__('Patient Progress'), function() {
				frappe.route_options = {'patient': frm.doc.name};
				frappe.set_route('patient-progress');
			}, __('View'));

			frm.add_custom_button(__('Patient History'), function() {
				frappe.route_options = {'patient': frm.doc.name};
				frappe.set_route('patient_history');
			}, __('View'));

      if (!frm.doc.__islocal && (frappe.user.has_role("Nursing User"))) {
        frm.add_custom_button(__('Ver Paciente Internado'), function() {
      var inpatientRecordName = frm.doc.inpatient_record;
      frappe.set_route('Form', 'Inpatient Record', inpatientRecordName);
            
        },__('View')); 
      }
		}

		frappe.dynamic_link = {doc: frm.doc, fieldname: 'name', doctype: 'Patient'};
		frm.toggle_display(['address_html', 'contact_html'], !frm.is_new());

		/*if (!frm.is_new()) {
			if (frappe.user.has_role('Physician')) {
				frm.add_custom_button(__('Medical Record'), function () {
					create_medical_record(frm);
				}, ('Crear'));
				frm.toggle_enable(['customer'], 0);
			}
			frappe.contacts.render_address_and_contact(frm);
			erpnext.utils.set_party_dashboard_indicators(frm);
		} else {
			frappe.contacts.clear_address_and_contact(frm);
		}*/

    var inpatientStatus = frm.doc.inpatient_status;

    if (!frm.doc.__islocal && (inpatientStatus != "Admitted") && (inpatientStatus != "Admission Scheduled")) {
      frm.add_custom_button(__('Internar paciente'), function() {
        create_and_save_inpatient_record(frm);
      });
    }
    
    var create_and_save_inpatient_record = async function (frm) {
      frappe.route_options = {
        "patient": frm.doc.name,
        "status": "Admission Scheduled",
        "reference_doctype": "Inpatient Record",
        "reference_owner": frm.doc.owner
      };
    
      try {
        let doc = await frappe.new_doc("Inpatient Record");
    
        // Setear los valores necesarios en el documento antes de guardarlo automáticamente
        doc.admitted_datetime = frappe.datetime.now_datetime();
        // Aquí puedes asignar cualquier otro valor requerido antes de guardar el registro.
    
        await doc.insert();
    
        // Obtener el nombre del nuevo Inpatient Record
        const inpatientRecordName = doc.name;
    
        // Redirigir al usuario a la vista del nuevo Inpatient Record después de guardar
        frappe.set_route('Form', 'Inpatient Record', inpatientRecordName);
    
        frm.save_or_update();
      } catch (error) {
        console.error(error);
      }
    };

    if (!frm.doc.__islocal && (inpatientStatus!="Admitted") && (inpatientStatus!="Admission Scheduled")) {
      frm.add_custom_button(__('Programar admisión'), function () { 
        create_encuentro_medico(frm); 
      }); 
    }
    
    var create_encuentro_medico = function (frm) { 
      frappe.route_options = { "patient": frm.doc.name, "status": "", "reference_doctype": "Patient Encounter", "reference_owner": frm.doc.owner }; 
      frappe.new_doc("Patient Encounter"); 
    }
  },
  
  

	/*after_save: function(frm) {
    // Obtener el ID del nuevo paciente guardado
    var nuevoPacienteId = frm.user_id;
    
    var nuevaURL = 'https://d48e-186-48-84-146.ngrok-free.app/app/patient-encounter/new-patient-encounter-' + nuevoPacienteId;
    window.location.href = nuevaURL; 
  },
  */
  onload: function (frm) {
		if (frm.doc.dob) {
			$(frm.fields_dict['age_html'].wrapper).html(`${__('AGE')} : ${get_age(frm.doc.dob)}`);
		} else {
			$(frm.fields_dict['age_html'].wrapper).html('');
		}
	}
});

frappe.ui.form.on('Patient', 'dob', function(frm) {
	if (frm.doc.dob) {
		let today = new Date();
		let birthDate = new Date(frm.doc.dob);
		if (today < birthDate) {
			frappe.msgprint(__('Please select a valid Date'));
			frappe.model.set_value(frm.doctype,frm.docname, 'dob', '');
		} else {
			let age_str = get_age(frm.doc.dob);
			$(frm.fields_dict['age_html'].wrapper).html(`${__('AGE')} : ${age_str}`);
		}
	} else {
		$(frm.fields_dict['age_html'].wrapper).html('');
	}
});

frappe.ui.form.on('Patient Relation', {
	patient_relation_add: function(frm){
		frm.fields_dict['patient_relation'].grid.get_field('patient').get_query = function(doc){
			let patient_list = [];
			if(!doc.__islocal) patient_list.push(doc.name);
			$.each(doc.patient_relation, function(idx, val){
				if (val.patient) patient_list.push(val.patient);
			});
			return { filters: [['Patient', 'name', 'not in', patient_list]] };
		};
	}
});

let create_medical_record = function (frm) {
	frappe.route_options = {
		'patient': frm.doc.name,
		'status': 'Open',
		'reference_doctype': 'Patient Medical Record',
		'reference_owner': frm.doc.owner
	};
	frappe.new_doc('Patient Medical Record');
};

let get_age = function (birth) {
	let ageMS = Date.parse(Date()) - Date.parse(birth);
	let age = new Date();
	age.setTime(ageMS);
	let years = age.getFullYear() - 1970;
	return years + ' Year(s) ' + age.getMonth() + ' Month(s) ' + age.getDate() + ' Day(s)';
};

let create_vital_signs = function (frm) {
	if (!frm.doc.name) {
		frappe.throw(__('Please save the patient first'));
	}
	frappe.route_options = {
		'patient': frm.doc.name,
	};
	frappe.new_doc('Vital Signs');
};

let create_encounter = function (frm) {
	if (!frm.doc.name) {
		frappe.throw(__('Please save the patient first'));
	}
	frappe.route_options = {
		'patient': frm.doc.name,
	};
	frappe.new_doc('Patient Encounter');
};

let invoice_registration = function (frm) {
	frappe.call({
		doc: frm.doc,
		method: 'invoice_patient_registration',
		callback: function(data) {
			if (!data.exc) {
				if (data.message.invoice) {
					frappe.set_route('Form', 'Sales Invoice', data.message.invoice);
				}
				cur_frm.reload_doc();
			}
		}
	});
};
