import { Flag } from "./baseDatastore";

const AUTH_STATE_KEY = "authState";
export type AuthState = {
  token: string;
  user: MaishaSignInResponse;
};

export type MaishaSignInResponse = {
  email: string;
  name: string;
  phone_number: string;
  user_id: string;
  username: string;
  error?: string;
};

export type MaishaFacility = {
  address: string;
  business_registration_number: string | null;
  city: string;
  country: "Kenya";
  dashboard_query_id: string;
  facility_id: string;
  facility_setting: object;
  id: string;
  latitude: string;
  longitude: string;
  mpesa_till_number: string;
  name: string;
  notes: string | null;
  phone_number: string | null;
};

export type LoyaltySoldProduct = {
  api: string;
  brand: string;
  care_pathway_answer_id: string;
  category: string;
  cost_price_cents: number;
  description: string | null;
  id: string;
  loyalty_price_cents: number;
  product_id: string;
  retail_price_cents: number;
  stock_code: string | null;
  strength: string | null;
  unit_type: string;
  unit_volume: number | null;
  wholesale_price_cents: number;
};

export type MaishaPatient = {
  birthday: string;
  birthday_accuracy: string;
  enrolled_at: string;
  first_name: string;
  gender: string;
  id: string;
  last_name: string;
  membership_card_number: string;
  national_id_hash: string;
  phone_number: string | null;
};

export type CarePathwayAnswerPhoto = {
  care_pathway_answer_id: string;
  id: string;
  photo_url: string;
};

export enum MaishaApprovalStatus {
  RECEIVED = "received",
  APPROVED = "approved",
  PATIENT_REVIEW = "needs_patient_review",
  REJECTED_REVIEW = "needs_rejected_review",
  FINAL_APPROVAL = "needs_final_approval",
  REJECTED = "rejected",
}

export enum MaishaPaidStatus {
  PAID = "paid",
  UNPAID = "unpaid",
}

export type CarePathwayInstance = {
  approval_status: MaishaApprovalStatus;
  payment_status: MaishaPaidStatus;
  address: string;
  business_registration_number: string;
  care_pathway_answers: {
    care_pathway_instance_id: string;
    id: string;
    loyalty_sold_products: LoyaltySoldProduct[];
    ref: string;
    value: string;
  }[];
  care_pathway_answer_photos: CarePathwayAnswerPhoto[];
  city: string;
  country: string;
  dashboard_query_id: string;
  facility_id: string;
  facility_reimbursement_cents: number;
  facility_setting: any;
  id: string;
  latitude: string;
  longitude: string;
  mpesa_till_number: string;
  name: string;
  notes: string | null;
  phone_number: string;
  loyalty_sold_products?: LoyaltySoldProduct[];
  patient?: MaishaPatient;
  started_at: string;
  completed_at: string;
};

export type MaishaFlagsResponse = {
  compliance_flags: {
    care_pathway_instance_id: string;
    flags: Flag[];
  }[];
};

export class MaishaApi {
  constructor(
    readonly endpointRoot: string,
    readonly onAuthFailed: () => void
  ) {}

  async isLoggedIn(): Promise<boolean> {
    try {
      // TODO(ram): Use a status endpoint
      await this.fetchWithToken("/facilities?loyalty_enabled=true");
      return true;
    } catch {
      return false;
    }
  }

  async postLoyaltyPayment(body: {
    loyalty_payment: {
      care_pathway_instance_ids: string[];
      notes: string;
      mpesa_confirmation: string;
      id: string;
      total_cents: number;
    };
  }): Promise<void> {
    await this.fetchWithToken("/loyalty_payment", "POST", body);
  }

  async postApprovalStatusUpdate(body: {
    care_pathway_instance_approval_status_update_event: {
      care_pathway_instance_ids: string[];
      manually_reviewed_ids: string[];
      flagged_for_patient_review_ids: string[];
      new_approval_status: MaishaApprovalStatus;
      notes: string;
      event_id: string;
      client_timestamp: string;
      device_id: string;
    };
  }) {
    await this.fetchWithToken(
      "/care_pathway_instance_approval_status_update_event",
      "POST",
      body
    );
  }

  async getFacilities(): Promise<{ facilities: MaishaFacility[] }> {
    return await this.fetchWithToken("/facilities?loyalty_enabled=true");
  }

  async getCarePathwayInstances(
    facilityId: string,
    cursor: string,
    approvalStatus?: MaishaApprovalStatus,
    paymentStatus?: MaishaPaidStatus
  ): Promise<{ care_pathway_instances: CarePathwayInstance[] }> {
    const params = new URLSearchParams({ cursor });
    if (approvalStatus) {
      params.append("approval_status", approvalStatus);
    }
    if (paymentStatus) {
      params.append("payment_status", paymentStatus);
    }
    return await this.fetchWithToken(
      `/facilities/${facilityId}/care_pathway_instances?${params.toString()}`
    );
  }

  async getComplianceFlags(
    carePathwayInstanceIds: string[]
  ): Promise<MaishaFlagsResponse> {
    const params = new URLSearchParams();
    carePathwayInstanceIds.forEach(instanceId =>
      params.append("care_pathway_instance_ids[]", instanceId)
    );
    return await this.fetchWithToken(
      `/compliance_flags/?${params.toString()}`,
      "GET"
    );
  }

  async fetchWithToken(
    path: string,
    method: string = "GET",
    body?: any
  ): Promise<any> {
    const authState = this.getLocalAuthState();
    if (!authState) {
      throw new Error("Attempted to fetch without token");
    }
    const { token } = authState;
    const res = await fetch(this.endpointRoot + path, {
      method,
      headers: {
        ...(token
          ? {
              Authorization: token,
            }
          : {}),
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!res.ok) {
      if (res.status === 401) {
        this.onAuthFailed();
      }
      throw new Error(await res.text());
    }
    return res.json();
  }

  getLocalAuthState(): AuthState | null {
    const authStateString = localStorage.getItem(AUTH_STATE_KEY);
    if (!authStateString) {
      return null;
    }
    return JSON.parse(authStateString) as AuthState;
  }

  setLocalAuthState(state: AuthState) {
    localStorage.setItem(AUTH_STATE_KEY, JSON.stringify(state));
  }

  clearLocalAuthState() {
    localStorage.removeItem(AUTH_STATE_KEY);
  }
}
