# -*- coding: utf-8 -*-
# Copyright (c) 2018, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt


import json

import frappe
from frappe import _
from frappe.desk.reportview import get_match_cond
from frappe.model.document import Document
from frappe.utils import get_datetime, get_link_to_form, getdate, now_datetime, today

from healthcare.healthcare.doctype.nursing_task.nursing_task import NursingTask
from healthcare.healthcare.utils import validate_nursing_tasks
from datetime import datetime
import random
from healthcare.healthcare.doctype.patient_encounter.patient_encounter import (
	get_prescription_dates,
)
#from frappe.utils import add_to_date
#from frappe import enqueue


class InpatientRecord(Document):
	@frappe.whitelist()
	def add_order_entries(self, order):
		#inpatient_record = frappe.get_doc("Inpatient Record", inpatient_record)
		#inpatient_record.start_date = start_date


		if order.get("drug_code"):
			dosage = frappe.get_doc("Prescription Dosage", order.get("dosage"))
			dates = get_prescription_dates(order.get("period"), self.start_date)
			for date in dates:
				for dose in dosage.dosage_strength:
					entry = self.append("medication_orders")
					entry.motivo = order.get("motivo")
					entry.drug = order.get("drug_code")
					entry.drug_name = frappe.db.get_value("Item", order.get("drug_code"), "item_name")
					entry.dosage = dose.strength
					entry.cantidad = order.get("cantidad")
					entry.dosage_form = order.get("dosage_form")
					entry.date = date
					entry.time = dose.strength_time
					entry2 = self.append("medication_orders2")
					entry2.motivo = order.get("motivo")
					entry2.drug = order.get("drug_code")
					entry2.drug_name = frappe.db.get_value("Item", order.get("drug_code"), "item_name")
					entry2.dosage = dose.strength
					entry2.cantidad = order.get("cantidad")
					entry2.dosage_form = order.get("dosage_form")
					entry2.date = date
					entry2.time = dose.strength_time
			self.end_date = dates[-1]

		return

	
	#@frappe.whitelist()
	#def add_order_entries_admitted(self, order):
		#if order.get("drug_code"):
				#dosage = frappe.get_doc("Prescription Dosage", order.get("dosage"))
				
				#period = order.get("period")  # Obtener el valor del campo "period"

				#if period == "1000 Week" and self.status == 'Admitted':
						#entry_dates = []
						#current_date = frappe.utils.today()  # Comenzar desde la fecha actual
						#while self.status == 'Admitted':
								#entry_dates.append(current_date)
								#current_date = frappe.utils.add_days(current_date, 1)
								#for date in entry_dates:
										#for dose in dosage.dosage_strength:
												# Convertir la cadena en un objeto datetime.time
												#time_str = dose.strength_time
												#time_obj = datetime.strptime(time_str, '%H:%M').time()

												#entry = self.append("medication_orders")
												#entry.motivo = order.get("motivo")
												#entry.drug = order.get("drug_code")
												#entry.drug_name = frappe.db.get_value("Item", order.get("drug_code"), "item_name")
												#entry.dosage = dose.strength
												#entry.cantidad = order.get("cantidad")
												#entry.dosage_form = order.get("dosage_form")
												#entry.date = date
												#entry.time = time_obj
												#entry2 = self.append("medication_orders2")
												#entry2.motivo = order.get("motivo")
												#entry2.drug = order.get("drug_code")
												#entry2.drug_name = frappe.db.get_value("Item", order.get("drug_code"), "item_name")
												#entry2.dosage = dose.strength
												#entry.cantidad = order.get("cantidad")
												#entry2.dosage_form = order.get("dosage_form")
												#entry2.date = date
												#entry2.time = time_obj
					
		#return

	def after_insert(self):
		frappe.db.set_value("Patient", self.patient, "inpatient_record", self.name)
		frappe.db.set_value("Patient", self.patient, "inpatient_status", self.status)

		if self.admission_encounter:  # Update encounter
			frappe.db.set_value(
				"Patient Encounter", self.admission_encounter, "inpatient_record", self.name
			)
			frappe.db.set_value(
				"Patient Encounter", self.admission_encounter, "inpatient_status", self.status
			)

		if self.admission_nursing_checklist_template:
			NursingTask.create_nursing_tasks_from_template(
				template=self.admission_nursing_checklist_template,
				doc=self,
			)

		self.save_patient_observations()



	def update_cama_actual(doc, method):
		if doc.inpatient_occupancies:
				# Suponiendo que inpatient_occupancies es una lista de objetos JSON
				# donde cada objeto tiene el campo service_unit
				service_units = [occupancy.service_unit for occupancy in doc.inpatient_occupancies]

				# Puedes seleccionar uno de los valores (en este ejemplo, el primero)
				doc.cama_actual = service_units[0]

	def on_update(self):
		self.actualizar_diagnostico_principal()
		self.save_patient_observations()
		self.save_patient_registro_medico()
		self.save_patient_medication()
		#self.save_patient_medication2()


	def actualizar_diagnostico_principal(self):
		if self.diagnosis:
			primer_diagnostico = self.diagnosis[0].diagnosis
			self.diagnostico_principal = primer_diagnostico

	def save_patient_observations(self):
		if not self.observaciones_ or not len(self.observaciones_):
				return

		old_observations = list(map(lambda x: x.as_dict(), self.get_doc_before_save().observaciones_))
		new_observations = list(map(lambda x: x.as_dict(), self.observaciones_))


		# Reemplazo este campo que cambia siempre:
		for obs in old_observations:
				obs.modified = ""

		for obs in new_observations:
				obs.modified = ""


		old_observations = json.dumps(old_observations, sort_keys=True, default=str)
		new_observations = json.dumps(new_observations, sort_keys=True, default=str)


		if old_observations != new_observations:
				observaciones_doc = frappe.new_doc("Observaciones del paciente")
				observaciones_doc.patient = self.patient
				observaciones_doc.observaciones_ = self.observaciones_.copy()
				observaciones_doc.save()
				observaciones_doc.submit()

	def save_patient_registro_medico(self):
		if not self.registro_médico or not len(self.registro_médico):
			return

		old_observations2 = list(map(lambda x: x.as_dict(), self.get_doc_before_save().registro_médico))
		new_observations2 = list(map(lambda x: x.as_dict(), self.registro_médico))

		for obs in old_observations2:
				obs.modified = ""

		for obs in new_observations2:
				obs.modified = ""

		old_observations2 = json.dumps(old_observations2, sort_keys=True, default=str)
		new_observations2 = json.dumps(new_observations2, sort_keys=True, default=str)

		if old_observations2 != new_observations2:
				registro_médicodoc = frappe.new_doc("Observaciones del paciente")
				registro_médicodoc.patient = self.patient
				registro_médicodoc.registro_médico = self.registro_médico.copy()  # Aquí corregimos para que use registro_médico
				registro_médicodoc.save()
				registro_médicodoc.submit()

	def save_patient_medication(self):
		if not self.medication_orders or not len(self.medication_orders):
				return

		old_medication= list(map(lambda x: x.as_dict(), self.get_doc_before_save().medication_orders))
		new_medication = list(map(lambda x: x.as_dict(), self.medication_orders))

		old_medication_keys = list(map(lambda x: x.as_dict()['name'], self.get_doc_before_save().medication_orders))
		new_medication_keys = list(map(lambda x: x.as_dict()['name'], self.medication_orders))

		unique_medication_keys = list(set(new_medication_keys) - set(old_medication_keys))
		if not len(unique_medication_keys):
			print("Se eliminaron medicamentos")
			return


		f = open("/tmp/nacho1.txt", "w");
		f.write(str(unique_medication_keys))
		f.close()

		new_medication_orders = []
		for key in unique_medication_keys:
			item = None
			for medication in self.medication_orders:
				if medication.name == key:
					item = medication
					break

			if not item:
				continue

			item.modified = ""
			f = open("/tmp/nacho.txt", "w");
			f.write(str(item))
			f.close()
			new_medication_orders.append(item)

		for obs in old_medication:
				obs.modified = ""

		for obs in new_medication:
				obs.modified = ""

		old_medication = json.dumps(old_medication, sort_keys=True, default=str)
		new_medication = json.dumps(new_medication, sort_keys=True, default=str)
		if old_medication != new_medication:
				medication_ordersdoc = frappe.new_doc("Inpatient Medication Order")
				medication_ordersdoc.patient = self.patient
				medication_ordersdoc.start_date = self.start_date
				#medication_ordersdoc.status = self.estado_medicacion
				medication_ordersdoc.company = self.company
				medication_ordersdoc.medication_orders = new_medication_orders
				medication_ordersdoc.save()
				medication_ordersdoc.submit()

	#def save_patient_medication2(self):
		#if not self.medication_orders or not len(self.medication_orders):
				#return

		#old_medication2 = list(map(lambda x: x.as_dict(), self.get_doc_before_save().medication_orders))
		#new_medication2 = list(map(lambda x: x.as_dict(), self.medication_orders))

		#for obs in old_medication2:
				#obs.modified = ""

		#for obs in new_medication2:
				#obs.modified = ""

		#old_medication2 = json.dumps(old_medication2, sort_keys=True, default=str)
		#new_medication2 = json.dumps(new_medication2, sort_keys=True, default=str)

		#if old_medication2 != new_medication2:
				#medication_ordersdoc = frappe.new_doc("Reporte Farmacia")
				#medication_ordersdoc.patient = self.patient
				#medication_ordersdoc.start_date = self.start_date
				#medication_ordersdoc.company = self.company
				#medication_ordersdoc.medication_orders= self.medication_orders.copy()  # Aquí corregimos para que use registro_médico
				#medication_ordersdoc.save()
				#medication_ordersdoc.submit()

#				for observaciones_ in self.observaciones_:
#						observaciones_doc.append("registro_medico", {
#								"observacion": observaciones_.observacion,
#								"nombre_del_practicante": observaciones_.nombre_del_practicante,
#								"fecha": observaciones_.fecha,

#								# Agrega más campos según sea necesario
#						})

#				observaciones_doc.insert(ignore_permissions=True)
#				observaciones_doc.submit()



	#def validate(self):
	#	for prescription in self.drug_prescription:
	#		self.append("medication_orders", {
	#			"drug_code": prescription.drug,
	#			})

	#	self.validate_dates()
	#	self.validate_already_scheduled_or_admitted()

	#	if self.status in ["Discharged", "Cancelled"]:
	#			frappe.db.set_value(
	#					"Patient", self.patient, {"inpatient_status": None, "inpatient_record": None}
	#			)

	def validate_dates(self):
		if (getdate(self.expected_discharge) < getdate(self.scheduled_date)) or (
			getdate(self.discharge_ordered_date) < getdate(self.scheduled_date)
		):
			frappe.throw(_("Expected and Discharge dates cannot be less than Admission Schedule date"))

		for entry in self.inpatient_occupancies:
			if (
				entry.check_in
				and entry.check_out
				and get_datetime(entry.check_in) > get_datetime(entry.check_out)
			):
				frappe.throw(
					_("Row #{0}: Check Out datetime cannot be less than Check In datetime").format(entry.idx)
				)

	def validate_already_scheduled_or_admitted(self):
		query = """
			select name, status
			from `tabInpatient Record`
			where (status = 'Admitted' or status = 'Admission Scheduled')
			and name != %(name)s and patient = %(patient)s
			"""

		ip_record = frappe.db.sql(query, {"name": self.name, "patient": self.patient}, as_dict=1)

		if ip_record:
			msg = _(
				("Already {0} Patient {1} with Inpatient Record ").format(ip_record[0].status, self.patient)
				+ """ <b><a href="/app/Form/Inpatient Record/{0}">{0}</a></b>""".format(ip_record[0].name)
			)
			frappe.throw(msg)

	@frappe.whitelist()
	def admit(self, service_unit, check_in, primary_practitioner, paciente_pertenencias, orden_medica, indicaciones_al_ingreso, expected_discharge=None):
		admit_patient(self, service_unit, check_in, primary_practitioner, paciente_pertenencias, orden_medica, indicaciones_al_ingreso,expected_discharge)



	@frappe.whitelist()
	def discharge(self, discharge_instructions):
		discharge_patient(self, discharge_instructions)

	@frappe.whitelist()
	def transfer(self, service_unit, check_in, leave_from):
		if leave_from:
			patient_leave_service_unit(self, check_in, leave_from)
		if service_unit:
			transfer_patient(self, service_unit, check_in)

@frappe.whitelist()
def schedule_inpatient(args):
	admission_order = json.loads(args)  # admission order via Encounter
	if (
		not admission_order
		or not admission_order["patient"]
		or not admission_order["admission_encounter"]
	):
		frappe.throw(_("Missing required details, did not create Inpatient Record"))

	inpatient_record = frappe.new_doc("Inpatient Record")

	# Admission order details
	set_details_from_ip_order(inpatient_record, admission_order)

	# Patient details
	patient = frappe.get_doc("Patient", admission_order["patient"])
	inpatient_record.patient = patient.name
	inpatient_record.patient_name = patient.patient_name
	inpatient_record.gender = patient.sex
	inpatient_record.blood_group = patient.blood_group
	inpatient_record.dob = patient.dob
	inpatient_record.mobile = patient.mobile
	inpatient_record.email = patient.email
	inpatient_record.phone = patient.phone
	inpatient_record.scheduled_date = today()

	# Set encounter details
	encounter = frappe.get_doc("Patient Encounter", admission_order["admission_encounter"])
	if encounter and encounter.symptoms:  # Symptoms
		set_ip_child_records(inpatient_record, "chief_complaint", encounter.symptoms)

	if encounter and encounter.diagnosis:  # Diagnosis
		set_ip_child_records(inpatient_record, "diagnosis", encounter.diagnosis)

	if encounter and encounter.drug_prescription:  # Medication
		set_ip_child_records(inpatient_record, "drug_prescription", encounter.drug_prescription)

	if encounter and encounter.medication_orders:  # Medication
		set_ip_child_records(inpatient_record, "medication_orders", encounter.medication_orders)

	if encounter and encounter.lab_test_prescription:  # Lab Tests
		set_ip_child_records(inpatient_record, "lab_test_prescription", encounter.lab_test_prescription)

	if encounter and encounter.procedure_prescription:  # Procedure Prescription
		set_ip_child_records(
			inpatient_record, "procedure_prescription", encounter.procedure_prescription
		)

	if encounter and encounter.therapies:  # Therapies
		inpatient_record.therapy_plan = encounter.therapy_plan
		set_ip_child_records(inpatient_record, "therapies", encounter.therapies)

	inpatient_record.status = "Admission Scheduled"
	inpatient_record.save(ignore_permissions=True)


@frappe.whitelist()
def schedule_discharge(args):
	discharge_order = json.loads(args)
	inpatient_record_id = frappe.db.get_value(
		"Patient", discharge_order["patient"], "inpatient_record"
	)

	if inpatient_record_id:

		inpatient_record = frappe.get_doc("Inpatient Record", inpatient_record_id)
		check_out_inpatient(inpatient_record)
		set_details_from_ip_order(inpatient_record, discharge_order)
		inpatient_record.status = "Discharge Scheduled"
		inpatient_record.save(ignore_permissions=True)


		frappe.db.set_value(
			"Patient", discharge_order["patient"], "inpatient_status", inpatient_record.status
		)
		if inpatient_record.discharge_encounter:
			frappe.db.set_value(
				"Patient Encounter",
				inpatient_record.discharge_encounter,
				"inpatient_status",
				inpatient_record.status,
			)

		if inpatient_record.discharge_nursing_checklist_template:
			NursingTask.create_nursing_tasks_from_template(
				inpatient_record.discharge_nursing_checklist_template,
				inpatient_record,
				start_time=now_datetime(),
			)


def set_details_from_ip_order(inpatient_record, ip_order):
	for key in ip_order:
		inpatient_record.set(key, ip_order[key])


def set_ip_child_records(inpatient_record, inpatient_record_child, encounter_child):
	for item in encounter_child:
		table = inpatient_record.append(inpatient_record_child)
		for df in table.meta.get("fields"):
			table.set(df.fieldname, item.get(df.fieldname))


def check_out_inpatient(inpatient_record):
	if inpatient_record.inpatient_occupancies:
		for inpatient_occupancy in inpatient_record.inpatient_occupancies:
			if inpatient_occupancy.left != 1:
				inpatient_occupancy.left = True
				inpatient_occupancy.check_out = now_datetime()
				frappe.db.set_value(
					"Healthcare Service Unit", inpatient_occupancy.service_unit, "occupancy_status", "Vacant"
				)

def discharge_patient(inpatient_record,discharge_instructions):
		# Utiliza los valores pasados como argumentos en lugar de variables no definidas
		validate_nursing_tasks(inpatient_record)
		#validate_inpatient_invoicing(inpatient_record)
		inpatient_record.discharge_datetime = now_datetime()
		inpatient_record.discharge_instructions = discharge_instructions
		inpatient_record.status = "Discharged"
		inpatient_record.save(ignore_permissions=True)

#def validate_inpatient_invoicing(inpatient_record):
#	if frappe.db.get_single_value("Healthcare Settings", "allow_discharge_despite_unbilled_services"):
#		return

#	pending_invoices = get_pending_invoices(inpatient_record)

#	if pending_invoices:
#		message = _("Cannot mark Inpatient Record as Discharged since there are unbilled services. ")

#		formatted_doc_rows = ""

#		for doctype, docnames in pending_invoices.items():
#			formatted_doc_rows += """
#				<td>{0}</td>
#				<td>{1}</td>
#			</tr>""".format(
#				doctype, docnames
#			)

#		message += """
#			<table class='table'>
#				<thead>
#					<th>{0}</th>
#					<th>{1}</th>
#				</thead>
#				{2}
#			</table>
#		""".format(
#			_("Healthcare Service"), _("Documents"), formatted_doc_rows
#		)

#		frappe.throw(message, title=_("Unbilled Services"), is_minimizable=True, wide=True)


def get_pending_invoices(inpatient_record):
	pending_invoices = {}
	if inpatient_record.inpatient_occupancies:
		service_unit_names = False
		for inpatient_occupancy in inpatient_record.inpatient_occupancies:
			if not inpatient_occupancy.invoiced:
				if is_service_unit_billable(inpatient_occupancy.service_unit):
					if service_unit_names:
						service_unit_names += ", " + inpatient_occupancy.service_unit
					else:
						service_unit_names = inpatient_occupancy.service_unit
		if service_unit_names:
			pending_invoices["Inpatient Occupancy"] = service_unit_names

	docs = ["Patient Appointment", "Patient Encounter", "Lab Test", "Clinical Procedure"]

	for doc in docs:
		doc_name_list = get_unbilled_inpatient_docs(doc, inpatient_record)
		if doc_name_list:
			pending_invoices = get_pending_doc(doc, doc_name_list, pending_invoices)

	return pending_invoices


def get_pending_doc(doc, doc_name_list, pending_invoices):
	if doc_name_list:
		doc_ids = False
		for doc_name in doc_name_list:
			doc_link = get_link_to_form(doc, doc_name.name)
			if doc_ids:
				doc_ids += ", " + doc_link
			else:
				doc_ids = doc_link
		if doc_ids:
			pending_invoices[doc] = doc_ids

	return pending_invoices


def get_unbilled_inpatient_docs(doc, inpatient_record):
	return frappe.db.get_list(
		doc,
		filters={
			"patient": inpatient_record.patient,
			"inpatient_record": inpatient_record.name,
			"docstatus": 1,
			"invoiced": 0,
		},
	)


def admit_patient(inpatient_record, service_unit, check_in, primary_practitioner, paciente_pertenencias, orden_medica, indicaciones_al_ingreso, expected_discharge=None):
		validate_nursing_tasks(inpatient_record)

		inpatient_record.admitted_datetime = check_in
		inpatient_record.status = "Admitted"
		inpatient_record.primary_practitioner = primary_practitioner
		inpatient_record.paciente_pertenencias = paciente_pertenencias
		inpatient_record.orden_medica = orden_medica
		inpatient_record.indicaciones_al_ingreso = indicaciones_al_ingreso
		inpatient_record.expected_discharge = expected_discharge

		inpatient_record.set("inpatient_occupancies", [])
		transfer_patient(inpatient_record, service_unit, check_in)

		# Save the inpatient_record object
		inpatient_record.save(ignore_permissions=True)

		frappe.db.set_value(
				"Patient",
				inpatient_record.patient,
				{"inpatient_status": "Admitted", "inpatient_record": inpatient_record.name},
		)

def transfer_patient(inpatient_record, service_unit, check_in):
	item_line = inpatient_record.append("inpatient_occupancies", {})
	item_line.service_unit = service_unit
	item_line.check_in = check_in

	inpatient_record.save(ignore_permissions=True)

	frappe.db.set_value("Healthcare Service Unit", service_unit, "occupancy_status", "Occupied")



def patient_leave_service_unit(inpatient_record, check_out, leave_from):
	if inpatient_record.inpatient_occupancies:
		for inpatient_occupancy in inpatient_record.inpatient_occupancies:
			if inpatient_occupancy.left != 1 and inpatient_occupancy.service_unit == leave_from:
				inpatient_occupancy.left = True
				inpatient_occupancy.check_out = check_out
				frappe.db.set_value(
					"Healthcare Service Unit", inpatient_occupancy.service_unit, "occupancy_status", "Vacant"
				)
	inpatient_record.save(ignore_permissions=True)


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def get_leave_from(doctype, txt, searchfield, start, page_len, filters):
	docname = filters["docname"]

	query = """select io.service_unit
		from `tabInpatient Occupancy` io, `tabInpatient Record` ir
		where io.parent = '{docname}' and io.parentfield = 'inpatient_occupancies'
		and io.left!=1 and io.parent = ir.name"""

	return frappe.db.sql(
		query.format(
			**{"docname": docname, "searchfield": searchfield, "mcond": get_match_cond(doctype)}
		),
		{"txt": "%%%s%%" % txt, "_txt": txt.replace("%", ""), "start": start, "page_len": page_len},
	)


def is_service_unit_billable(service_unit):
	service_unit_doc = frappe.qb.DocType("Healthcare Service Unit")
	service_unit_type = frappe.qb.DocType("Healthcare Service Unit Type")
	result = (
		frappe.qb.from_(service_unit_doc)
		.left_join(service_unit_type)
		.on(service_unit_doc.service_unit_type == service_unit_type.name)
		.select(service_unit_type.is_billable)
		.where(service_unit_doc.name == service_unit)
	).run(as_dict=1)
	return result[0].get("is_billable", 0)


@frappe.whitelist()
def set_ip_order_cancelled(inpatient_record, encounter=None):
	inpatient_record = frappe.get_doc("Inpatient Record", inpatient_record)
	if inpatient_record.status == "Admission Scheduled":
		inpatient_record.status = "Cancelled"
		#inpatient_record.reason_for_cancellation = reason
		inpatient_record.save(ignore_permissions=True)
		encounter_name = encounter if encounter else inpatient_record.admission_encounter
		if encounter_name:
			frappe.db.set_value(
				"Patient Encounter", encounter_name, {"inpatient_status": None, "inpatient_record": None}
			)

@frappe.whitelist()
def cancelled_discharge(inpatient_record, encounter=None):
	inpatient_record = frappe.get_doc("Inpatient Record", inpatient_record)
	if inpatient_record.status == "Discharge Scheduled":
		inpatient_record.status = "Admitted"
		inpatient_record.save(ignore_permissions=True)
		encounter_name = encounter if encounter else inpatient_record.admission_encounter
		if encounter_name:
			frappe.db.set_value(
				"Patient Encounter", encounter_name, {"inpatient_status": None, "inpatient_record": None}
			)

#def cancel_reserved_bed_cron():
    # Lógica para cancelar la reserva de la cama
    # Por ejemplo, para cancelar todas las reservas de cama de los registros de pacientes ingresados
#   inpatient_records = frappe.get_all("Inpatient Record", filters={"status": "Schedule Admission"})
    
#  for inpatient_record in inpatient_records:
#       cancel_reserved_bed(inpatient_record.name)

#def on_update():
  # Aquí se agrega el cron job para ejecutar la función cada 48 horas
# enqueue("healthcare.healthcare.doctype.inpatient_record.inpatient_record.cancel_reserved_bed_cron", queue='long', timeout=300, now=True)
import random
def pruebaNacho():
	records = frappe.db.get_all('Inpatient Record');
	record = frappe.get_doc("Inpatient Record", random.choice(records)['name'])
	record.color = random.choice(['Amarillo', 'Rojo', 'Verde'])
	record.save(ignore_permissions=True)
