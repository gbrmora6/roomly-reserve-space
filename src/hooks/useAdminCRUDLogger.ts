import { useAdminLogger } from "./useAdminLogger";
import { useAuth } from "@/contexts/AuthContext";

export const useAdminCRUDLogger = () => {
  const { logAction } = useAdminLogger();
  const { user } = useAuth();

  const logCreate = (entityType: string, entityData: any, entityId?: string) => {
    logAction(`create_${entityType}`, {
      entity_type: entityType,
      entity_id: entityId,
      entity_data: entityData,
      action_type: "CREATE",
      timestamp: new Date().toISOString()
    }, user?.email);
  };

  const logUpdate = (entityType: string, entityId: string, oldData: any, newData: any) => {
    logAction(`update_${entityType}`, {
      entity_type: entityType,
      entity_id: entityId,
      old_data: oldData,
      new_data: newData,
      action_type: "UPDATE",
      timestamp: new Date().toISOString()
    }, user?.email);
  };

  const logDelete = (entityType: string, entityId: string, entityData: any) => {
    logAction(`delete_${entityType}`, {
      entity_type: entityType,
      entity_id: entityId,
      entity_data: entityData,
      action_type: "DELETE",
      timestamp: new Date().toISOString()
    }, user?.email);
  };

  const logStatusChange = (entityType: string, entityId: string, oldStatus: boolean, newStatus: boolean, entityName?: string) => {
    logAction(`status_change_${entityType}`, {
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      old_status: oldStatus,
      new_status: newStatus,
      action_type: "STATUS_CHANGE",
      timestamp: new Date().toISOString()
    }, user?.email);
  };

  return {
    logCreate,
    logUpdate,
    logDelete,
    logStatusChange
  };
};