
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "activity_log": {
                  Row: {
                    "actor_id": string | null,"client_visible": boolean,"created_at": string,"id": string,"message": string,"metadata": NonNullable<Json>,"project_id": string,"type": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"client_visible"?: boolean,"created_at"?: string,"id"?: string,"message": string,"metadata"?: NonNullable<Json>,"project_id": string,"type": string,"updated_at"?: string
                  }
                  Update: {
                    "actor_id"?: string | null,"client_visible"?: boolean,"created_at"?: string,"id"?: string,"message"?: string,"metadata"?: NonNullable<Json>,"project_id"?: string,"type"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "activity_log_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_log_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "project_budget"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "activity_log_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"approvals": {
                  Row: {
                    "comment": string,"created_at": string,"decision": Database["public"]['Enums']["approval_decision"],"document_id": string,"id": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "comment"?: string,"created_at"?: string,"decision": Database["public"]['Enums']["approval_decision"],"document_id": string,"id"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "comment"?: string,"created_at"?: string,"decision"?: Database["public"]['Enums']["approval_decision"],"document_id"?: string,"id"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "approvals_document_id_fkey"
      columns: ["document_id"]
isOneToOne: false
      referencedRelation: "documents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "approvals_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"areas": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"project_id": string,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string,"project_id": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"project_id"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "areas_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "project_budget"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "areas_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"budget_lines": {
                  Row: {
                    "amount": number,"created_at": string,"id": string,"kind": Database["public"]['Enums']["budget_kind"],"label": string,"project_id": string,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount"?: number,"created_at"?: string,"id"?: string,"kind": Database["public"]['Enums']["budget_kind"],"label": string,"project_id": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["budget_kind"],"label"?: string,"project_id"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "budget_lines_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "project_budget"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "budget_lines_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"clients": {
                  Row: {
                    "archived_at": string | null,"company": string,"created_at": string,"email": string | null,"id": string,"name": string,"phone": string,"updated_at": string,"xero_contact_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"company"?: string,"created_at"?: string,"email"?: string | null,"id"?: string,"name": string,"phone"?: string,"updated_at"?: string,"xero_contact_id"?: string | null
                  }
                  Update: {
                    "archived_at"?: string | null,"company"?: string,"created_at"?: string,"email"?: string | null,"id"?: string,"name"?: string,"phone"?: string,"updated_at"?: string,"xero_contact_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"documents": {
                  Row: {
                    "created_at": string,"file_path": string | null,"id": string,"kind": Database["public"]['Enums']["document_kind"],"project_id": string,"sent_at": string | null,"status": Database["public"]['Enums']["document_status"],"title": string,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"file_path"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["document_kind"],"project_id": string,"sent_at"?: string | null,"status"?: Database["public"]['Enums']["document_status"],"title": string,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "created_at"?: string,"file_path"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["document_kind"],"project_id"?: string,"sent_at"?: string | null,"status"?: Database["public"]['Enums']["document_status"],"title"?: string,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "documents_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "project_budget"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "documents_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"invoices": {
                  Row: {
                    "amount": number,"created_at": string,"id": string,"paid_at": string | null,"project_id": string,"sent_at": string | null,"status": Database["public"]['Enums']["invoice_status"],"type": Database["public"]['Enums']["invoice_type"],"updated_at": string,"xero_invoice_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount"?: number,"created_at"?: string,"id"?: string,"paid_at"?: string | null,"project_id": string,"sent_at"?: string | null,"status"?: Database["public"]['Enums']["invoice_status"],"type": Database["public"]['Enums']["invoice_type"],"updated_at"?: string,"xero_invoice_id"?: string | null
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"id"?: string,"paid_at"?: string | null,"project_id"?: string,"sent_at"?: string | null,"status"?: Database["public"]['Enums']["invoice_status"],"type"?: Database["public"]['Enums']["invoice_type"],"updated_at"?: string,"xero_invoice_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "invoices_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "project_budget"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "invoices_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"materials": {
                  Row: {
                    "actual_cost": number | null,"area_id": string | null,"created_at": string,"delivered_at": string | null,"expected_at": string | null,"id": string,"item": string,"lead_days": number | null,"line_total": number | null,"link": string,"notes": string,"order_id": string | null,"ordered_at": string | null,"priority": Database["public"]['Enums']["material_priority"],"project_id": string,"quantity": number,"sort_order": number,"spec": string,"status": Database["public"]['Enums']["material_status"],"supplier_id": string | null,"unit_cost": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actual_cost"?: number | null,"area_id"?: string | null,"created_at"?: string,"delivered_at"?: string | null,"expected_at"?: string | null,"id"?: string,"item": string,"lead_days"?: number | null,"line_total"?: never,"link"?: string,"notes"?: string,"order_id"?: string | null,"ordered_at"?: string | null,"priority"?: Database["public"]['Enums']["material_priority"],"project_id": string,"quantity"?: number,"sort_order"?: number,"spec"?: string,"status"?: Database["public"]['Enums']["material_status"],"supplier_id"?: string | null,"unit_cost"?: number,"updated_at"?: string
                  }
                  Update: {
                    "actual_cost"?: number | null,"area_id"?: string | null,"created_at"?: string,"delivered_at"?: string | null,"expected_at"?: string | null,"id"?: string,"item"?: string,"lead_days"?: number | null,"line_total"?: never,"link"?: string,"notes"?: string,"order_id"?: string | null,"ordered_at"?: string | null,"priority"?: Database["public"]['Enums']["material_priority"],"project_id"?: string,"quantity"?: number,"sort_order"?: number,"spec"?: string,"status"?: Database["public"]['Enums']["material_status"],"supplier_id"?: string | null,"unit_cost"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "materials_area_id_fkey"
      columns: ["area_id"]
isOneToOne: false
      referencedRelation: "areas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "materials_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "materials_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "project_budget"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "materials_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "materials_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "suppliers"
      referencedColumns: ["id"]
    }
                  ]
                },"orders": {
                  Row: {
                    "created_at": string,"delivered_at": string | null,"delivery_cost": number,"expected_at": string | null,"id": string,"items_total": number,"ordered_at": string | null,"paid_with": string,"project_id": string,"reference": string,"status": Database["public"]['Enums']["order_status"],"supplier_id": string | null,"total": number,"updated_at": string,"vat": number,"vat_included": boolean,"xero_po_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"delivered_at"?: string | null,"delivery_cost"?: number,"expected_at"?: string | null,"id"?: string,"items_total"?: number,"ordered_at"?: string | null,"paid_with"?: string,"project_id": string,"reference"?: string,"status"?: Database["public"]['Enums']["order_status"],"supplier_id"?: string | null,"total"?: number,"updated_at"?: string,"vat"?: number,"vat_included"?: boolean,"xero_po_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"delivered_at"?: string | null,"delivery_cost"?: number,"expected_at"?: string | null,"id"?: string,"items_total"?: number,"ordered_at"?: string | null,"paid_with"?: string,"project_id"?: string,"reference"?: string,"status"?: Database["public"]['Enums']["order_status"],"supplier_id"?: string | null,"total"?: number,"updated_at"?: string,"vat"?: number,"vat_included"?: boolean,"xero_po_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "orders_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "project_budget"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "orders_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "suppliers"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "client_id": string | null,"created_at": string,"email": string,"full_name": string,"id": string,"role": Database["public"]['Enums']["user_role"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id"?: string | null,"created_at"?: string,"email": string,"full_name"?: string,"id": string,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string
                  }
                  Update: {
                    "client_id"?: string | null,"created_at"?: string,"email"?: string,"full_name"?: string,"id"?: string,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    }
                  ]
                },"project_approvals": {
                  Row: {
                    "approved_at": string | null,"created_at": string,"gate_for_stage": string,"id": string,"kind": string,"project_id": string,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "approved_at"?: string | null,"created_at"?: string,"gate_for_stage": string,"id"?: string,"kind": string,"project_id": string,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "approved_at"?: string | null,"created_at"?: string,"gate_for_stage"?: string,"id"?: string,"kind"?: string,"project_id"?: string,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "project_approvals_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"project_stage_history": {
                  Row: {
                    "created_at": string,"entered_at": string,"exited_at": string | null,"id": string,"project_id": string,"stage": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"entered_at"?: string,"exited_at"?: string | null,"id"?: string,"project_id": string,"stage": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"entered_at"?: string,"exited_at"?: string | null,"id"?: string,"project_id"?: string,"stage"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "project_stage_history_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"projects": {
                  Row: {
                    "client_id": string,"contract_value": number | null,"created_at": string,"deposit_percent": number,"description": string,"due_date": string | null,"id": string,"name": string,"pinned": boolean,"stage": string,"start_date": string | null,"status": Database["public"]['Enums']["project_status"],"type": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id": string,"contract_value"?: number | null,"created_at"?: string,"deposit_percent"?: number,"description"?: string,"due_date"?: string | null,"id"?: string,"name": string,"pinned"?: boolean,"stage"?: string,"start_date"?: string | null,"status"?: Database["public"]['Enums']["project_status"],"type"?: string,"updated_at"?: string
                  }
                  Update: {
                    "client_id"?: string,"contract_value"?: number | null,"created_at"?: string,"deposit_percent"?: number,"description"?: string,"due_date"?: string | null,"id"?: string,"name"?: string,"pinned"?: boolean,"stage"?: string,"start_date"?: string | null,"status"?: Database["public"]['Enums']["project_status"],"type"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "projects_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    }
                  ]
                },"settings": {
                  Row: {
                    "away_from": string | null,"away_until": string | null,"business_email": string,"business_name": string,"created_at": string,"deposit_percent": number,"id": string,"singleton": boolean,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "away_from"?: string | null,"away_until"?: string | null,"business_email"?: string,"business_name"?: string,"created_at"?: string,"deposit_percent"?: number,"id"?: string,"singleton"?: boolean,"updated_at"?: string
                  }
                  Update: {
                    "away_from"?: string | null,"away_until"?: string | null,"business_email"?: string,"business_name"?: string,"created_at"?: string,"deposit_percent"?: number,"id"?: string,"singleton"?: boolean,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"suppliers": {
                  Row: {
                    "contact_name": string,"created_at": string,"default_lead_days": number,"email": string,"id": string,"name": string,"phone": string,"updated_at": string,"website": string,"xero_contact_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "contact_name"?: string,"created_at"?: string,"default_lead_days"?: number,"email"?: string,"id"?: string,"name": string,"phone"?: string,"updated_at"?: string,"website"?: string,"xero_contact_id"?: string | null
                  }
                  Update: {
                    "contact_name"?: string,"created_at"?: string,"default_lead_days"?: number,"email"?: string,"id"?: string,"name"?: string,"phone"?: string,"updated_at"?: string,"website"?: string,"xero_contact_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"xero_connection": {
                  Row: {
                    "access_token": string,"created_at": string,"expires_at": string,"id": string,"refresh_token": string,"tenant_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "access_token": string,"created_at"?: string,"expires_at": string,"id"?: string,"refresh_token": string,"tenant_id": string,"updated_at"?: string
                  }
                  Update: {
                    "access_token"?: string,"created_at"?: string,"expires_at"?: string,"id"?: string,"refresh_token"?: string,"tenant_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "delivery_stats": {
                  Row: {
                    "delivered_late": number | null,"delivered_on_time": number | null,"project_id": string,"still_outstanding": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "materials_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "project_budget"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "materials_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"project_budget": {
                  Row: {
                    "agreed_total": number | null,"contingency": number | null,"contingency_percent_used": number | null,"contingency_remaining": number | null,"delivery_charges": number | null,"design_delivery": number | null,"handyman": number | null,"materials_actual": number | null,"materials_line": number | null,"materials_planned": number | null,"other_lines": number | null,"project_id": string
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "get_client_materials":
{ Args: { "target_project": string }; Returns: {
              "area": string,"delivered_at": string,"expected_at": string,"item": string,"quantity": number,"status": Database["public"]['Enums']["material_status"]
            }[]
                           },
"is_owner":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"list_staff":
{ Args: Record<PropertyKey, never>; Returns: {
              "access": string,"email": string,"full_name": string,"job_title": string
            }[]
                           },
"is_staff":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"mark_late_deliveries":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"my_client_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"sign_in_kind":
{ Args: { "target_email": string }; Returns: string
                           }
          }
          Enums: {
            "approval_decision": "approved"|"changes_requested","budget_kind": "design_delivery"|"handyman"|"materials"|"contingency"|"other","document_kind": "proposal"|"scope_of_work"|"set_design"|"budget"|"sign_off"|"other","document_status": "draft"|"sent"|"approved"|"changes_requested","invoice_status": "draft"|"sent"|"paid"|"void","invoice_type": "deposit"|"final","material_priority": "normal"|"high","material_status": "to_order"|"ordered"|"delivered"|"late"|"cancelled","order_status": "draft"|"ordered"|"delivered"|"late"|"cancelled","project_status": "active"|"ongoing"|"on_hold"|"archived","user_role": "owner"|"viewer"|"client"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "approval_decision": ["approved", "changes_requested"],"budget_kind": ["design_delivery", "handyman", "materials", "contingency", "other"],"document_kind": ["proposal", "scope_of_work", "set_design", "budget", "sign_off", "other"],"document_status": ["draft", "sent", "approved", "changes_requested"],"invoice_status": ["draft", "sent", "paid", "void"],"invoice_type": ["deposit", "final"],"material_priority": ["normal", "high"],"material_status": ["to_order", "ordered", "delivered", "late", "cancelled"],"order_status": ["draft", "ordered", "delivered", "late", "cancelled"],"project_status": ["active", "ongoing", "on_hold", "archived"],"user_role": ["owner", "viewer", "client"]
          }
        }
} as const
