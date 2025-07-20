
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type SecurityAuditRow = Database['public']['Tables']['security_audit']['Row'];

export interface SecurityAuditEvent extends SecurityAuditRow {
  user_name?: string;
  target_user_name?: string;
}

interface SecurityAuditFilters {
  event_type?: string;
  severity?: string;
  user_id?: string;
  date_from?: string;
  date_to?: string;
  requires_review?: boolean;
}

export const useSecurityAudit = () => {
  const [events, setEvents] = useState<SecurityAuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async (filters?: SecurityAuditFilters) => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('security_audit')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.event_type) {
        query = query.eq('event_type', filters.event_type);
      }
      
      if (filters?.severity) {
        query = query.eq('severity', filters.severity);
      }
      
      if (filters?.user_id) {
        query = query.eq('user_id', filters.user_id);
      }
      
      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      
      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to);
      }
      
      if (filters?.requires_review !== undefined) {
        query = query.eq('requires_review', filters.requires_review);
      }

      const { data, error } = await query;

      if (error) throw error;

      setEvents(data || []);
    } catch (err: any) {
      console.error('Error fetching security audit events:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const markAsReviewed = async (eventId: string, reviewNotes?: string) => {
    try {
      const { error } = await supabase
        .from('security_audit')
        .update({
          requires_review: false,
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes
        })
        .eq('id', eventId);

      if (error) throw error;

      // Log this review action
      await supabase.rpc('log_security_event', {
        p_event_type: 'audit_review',
        p_action: 'mark_reviewed',
        p_details: {
          reviewed_event_id: eventId,
          review_notes: reviewNotes
        },
        p_severity: 'info',
        p_resource_type: 'security_audit',
        p_resource_id: eventId,
        p_risk_score: 10
      });

      await fetchEvents();
    } catch (err: any) {
      console.error('Error marking event as reviewed:', err);
      throw err;
    }
  };

  const logSecurityEvent = async (
    eventType: string,
    action: string,
    details: any,
    severity: string = 'info',
    resourceType?: string,
    resourceId?: string,
    riskScore: number = 0
  ) => {
    try {
      await supabase.rpc('log_security_event', {
        p_event_type: eventType,
        p_action: action,
        p_details: details,
        p_severity: severity,
        p_resource_type: resourceType,
        p_resource_id: resourceId,
        p_risk_score: riskScore
      });
    } catch (err: any) {
      console.error('Error logging security event:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  return {
    events,
    loading,
    error,
    fetchEvents,
    markAsReviewed,
    logSecurityEvent,
    refetch: fetchEvents,
  };
};

export default useSecurityAudit;
