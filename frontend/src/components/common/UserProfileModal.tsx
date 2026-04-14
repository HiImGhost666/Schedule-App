import { X, Mail, Phone, CalendarDays } from 'lucide-react';
import { type User, ROLE_LABELS } from '@/types';
import { getInitials, getAvatarColor, formatDate } from '@/lib/utils';

interface UserProfileModalProps {
    open: boolean;
    onClose: () => void;
    user: User | { id: string; name: string; email: string; avatarUrl?: string; department?: string; companyPhone?: string; auxiliaryPhone?: string; role?: any; createdAt?: string } | null;
}

export function UserProfileModal({ open, onClose, user }: UserProfileModalProps) {
    if (!open || !user) return null;

    const bgColor = getAvatarColor(user.name);
    const initials = getInitials(user.name);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up">
                {/* Header/Cover */}
                <div className="h-24 bg-navy-800 relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors z-10"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Profile Content */}
                <div className="px-6 pb-8 pt-0 -mt-10 relative">
                    <div
                        className="h-20 w-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-xl border-4 border-white mb-4 bg-navy-500"
                        style={{ backgroundColor: bgColor }}
                    >
                        {initials}
                    </div>

                    <div className="space-y-1">
                        <h2 className="text-xl font-bold text-navy-800">{user.name}</h2>
                        <div className="flex items-center gap-2">
                            <span className={`badge-role-${(user as User).role || 'viewer'}`}>
                                {ROLE_LABELS[(user as User).role || 'viewer']}
                            </span>
                            {user.department && (
                                <span className="text-xs text-navy-400 bg-navy-50 px-2 py-0.5 rounded-full">
                                    {user.department}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 space-y-4">
                        <div className="flex items-center gap-3 text-navy-600">
                            <div className="p-2 bg-navy-50 rounded-lg">
                                <Mail className="h-4 w-4 text-navy-400" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wider font-bold text-navy-300">Email</p>
                                <p className="text-sm font-medium truncate">{user.email}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-3 text-navy-600">
                                <div className="p-2 bg-navy-50 rounded-lg">
                                    <Phone className="h-4 w-4 text-navy-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider font-bold text-navy-300">Empresa</p>
                                    <p className="text-sm font-medium">{(user as User).companyPhone || '-'}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 text-navy-600">
                                <div className="p-2 bg-navy-50 rounded-lg">
                                    <Phone className="h-4 w-4 text-navy-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider font-bold text-navy-300">Auxiliar</p>
                                    <p className="text-sm font-medium">{(user as User).auxiliaryPhone || '-'}</p>
                                </div>
                            </div>
                        </div>

                        {(user as User).createdAt && (
                            <div className="flex items-center gap-3 text-navy-600">
                                <div className="p-2 bg-navy-50 rounded-lg">
                                    <CalendarDays className="h-4 w-4 text-navy-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider font-bold text-navy-300">En el sistema desde</p>
                                    <p className="text-sm font-medium">{formatDate((user as User).createdAt)}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-navy-50 border-t border-navy-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-semibold text-navy-600 hover:text-navy-800 transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
