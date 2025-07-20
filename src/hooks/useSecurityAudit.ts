import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBranchFilter } from "./useBranchFilter";
import { toast } from "sonner";

export interface SecurityAuditEvent {
  id: string;
  event_type: string;
  severity: 'info' | 'warning' | 'critical';
  user_id?: string;
  user_email?: string;
  user_role?: string;
  target_user_id?: string;
  resource_type?: string;
  resource_id?: string;
  action: string;
  details: any;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  request_id?: string;
  branch_id?: string;
  risk_score: number;
  requires_review: boolean;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  created_at: string;
}

export const useSecurityAudit = () => {
  const { branchId } = useBranchFilter();
  const queryClient = useQueryClient();

  // Buscar eventos de auditoria
  const { data: auditEvents = [], isLoading } = useQuery({
    queryKey: ['security-audit', branchId],
    queryFn: async () => {
      if (!branchId) return [];

      const { data, error } = await supabase
        .from('security_audit')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;
      return data as SecurityAuditEvent[];
    },
    enabled: !!branchId,
  });

  // Buscar eventos que requerem revisão
  const { data: eventsRequiringReview = [] } = useQuery({
    queryKey: ['security-audit-review', branchId],
    queryFn: async () => {
      if (!branchId) return [];

      const { data, error } = await supabase
        .from('security_audit')
        .select('*')
        .eq('requires_review', true)
        .is('reviewed_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SecurityAuditEvent[];
    },
    enabled: !!branchId,
  });

  // Marcar evento como revisado
  const reviewEventMutation = useMutation({
    mutationFn: async (params: {
      eventId: string;
      reviewNotes?: string;
    }) => {
      const { error } = await supabase
        .from('security_audit')
        .update({
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          reviewed_at: new Date().toISOString(),
          review_notes: params.reviewNotes,
        })
        .eq('id', params.eventId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-audit'] });
      queryClient.invalidateQueries({ queryKey: ['security-audit-review'] });
      toast.success('Evento marcado como revisado');
    },
    onError: (error) => {
      console.error('Error reviewing event:', error);
      toast.error('Erro ao revisar evento');
    },
  });

  // Log de evento de segurança
  const logSecurityEvent = async (params: {
    eventType: string;
    action: string;
    details: any;
    severity?: 'info' | 'warning' | 'critical';
    resourceType?: string;
    resourceId?: string;
    riskScore?: number;
  }) => {
    await supabase.rpc('log_security_event', {
      p_event_type: params.eventType,
      p_action: params.action,
      p_details: params.details,
      p_severity: params.severity || 'info',
      p_resource_type: params.resourceType,
      p_resource_id: params.resourceId,
      p_risk_score: params.riskScore || 0
    });
  };

  // Estatísticas de auditoria
  const getAuditStats = () => {
    const totalEvents = auditEvents.length;
    const criticalEvents = auditEvents.filter(e => e.severity === 'critical').length;
    const warningEvents = auditEvents.filter(e => e.severity === 'warning').length;
    const highRiskEvents = auditEvents.filter(e => e.risk_score >= 70).length;
    const pendingReviewEvents = eventsRequiringReview.length;

    return {
      totalEvents,
      criticalEvents,
      warningEvents,
      highRiskEvents,
      pendingReviewEvents,
    };
  };

  return {
    auditEvents,
    eventsRequiringReview,
    isLoading,
    reviewEvent: reviewEventMutation.mutate,
    isReviewing: reviewEventMutation.isPending,
    logSecurityEvent,
    getAuditStats,
  };
};