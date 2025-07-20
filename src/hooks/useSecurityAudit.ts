
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBranchFilter } from "./useBranchFilter";
import { toast } from "sonner";

export interface SecurityAuditEvent {
  id: string;
  event_type: string;
  severity: string;
  user_id?: string;
  user_email?: string;
  user_role?: string;
  action: string;
  details: any;
  resource_type?: string;
  resource_id?: string;
  ip_address?: string;
  risk_score: number;
  requires_review: boolean;
  reviewed_at?: string;
  reviewed_by?: string;
  review_notes?: string;
  created_at: string;
  branch_id?: string;
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
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false });

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
        .eq('branch_id', branchId)
        .eq('requires_review', true)
        .is('reviewed_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SecurityAuditEvent[];
    },
    enabled: !!branchId,
  });

  // Revisar evento
  const reviewEvent = useMutation({
    mutationFn: async ({ eventId, reviewNotes }: { eventId: string; reviewNotes: string }) => {
      const { error } = await supabase
        .from('security_audit')
        .update({
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes,
        })
        .eq('id', eventId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-audit'] });
      queryClient.invalidateQueries({ queryKey: ['security-audit-review'] });
      toast.success('Evento revisado com sucesso');
    },
    onError: (error) => {
      console.error('Error reviewing event:', error);
      toast.error('Erro ao revisar evento');
    },
  });

  // Calcular estatísticas
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
    reviewEvent: reviewEvent.mutate,
    getAuditStats,
  };
};
