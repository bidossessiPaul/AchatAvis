import React from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { MdRestaurant, MdPlumbing, MdElectricalServices, MdRealEstateAgent, MdLocalHospital, MdOutlineDoorBack, MdDirectionsCar } from 'react-icons/md';
import { FaTruckMoving, FaGavel, FaHotel, FaGamepad, FaTools } from 'react-icons/fa';
import { GiBread, GiScissors } from 'react-icons/gi';
import { IoCafe, IoStorefrontSharp } from 'react-icons/io5';
import { HiOutlineComputerDesktop } from 'react-icons/hi2';

interface SectorItem {
    label: string;
    icon: React.ReactNode;
    critical?: boolean;
}

interface SectorGroup {
    level: string;
    rate: string;
    color: string;
    icon: React.ReactNode;
    items: SectorItem[];
}

export const SectorDifficultyList: React.FC = () => {
    const sectors: SectorGroup[] = [
        {
            level: 'FACILE',
            rate: '85-95%',
            color: '#22c55e',
            icon: <CheckCircle size={18} />,
            items: [
                { label: 'Restaurant', icon: <MdRestaurant /> },
                { label: 'Café', icon: <IoCafe /> },
                { label: 'Boulangerie', icon: <GiBread /> },
                { label: 'Coiffure & Esthétique', icon: <GiScissors /> },
                { label: 'Commerce & Boutiques', icon: <IoStorefrontSharp /> },
                { label: 'Hôtel & Hébergement', icon: <FaHotel /> },
                { label: 'Loisirs & Divertissement', icon: <FaGamepad /> }
            ]
        },
        {
            level: 'MOYEN',
            rate: '70-84%',
            color: '#f59e0b',
            icon: <Info size={18} />,
            items: [
                { label: 'Automobile & VTC', icon: <MdDirectionsCar /> },
                { label: 'Immobilier (Agence)', icon: <MdRealEstateAgent /> },
                { label: 'Santé & Bien-être', icon: <MdLocalHospital /> },
                { label: 'Menuiserie', icon: <FaTools /> },
                { label: 'Technologie & Réparation', icon: <HiOutlineComputerDesktop /> }
            ]
        },
        {
            level: 'DIFFICILE',
            rate: '50-69%',
            color: '#ef4444',
            icon: <AlertTriangle size={18} />,
            items: [
                { label: 'Plomberie & Chauffage', icon: <MdPlumbing />, critical: true },
                { label: 'Serrurier (Urgence)', icon: <MdOutlineDoorBack />, critical: true },
                { label: 'Électricité', icon: <MdElectricalServices />, critical: true },
                { label: 'Déménagement', icon: <FaTruckMoving />, critical: true },
                { label: 'Services Juridiques', icon: <FaGavel />, critical: true }
            ]
        }
    ];

    return (
        <div style={{ marginBottom: '3rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <Shield size={20} color="#0f172a" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Indice de Vigilance par Secteur
                </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {sectors.map((group, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        style={{
                            background: 'white',
                            borderRadius: '1.25rem',
                            border: `1px solid ${group.color}20`,
                            padding: '1.5rem',
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            width: '100px',
                            height: '100px',
                            background: `radial-gradient(circle at top right, ${group.color}08, transparent 70%)`,
                            pointerEvents: 'none'
                        }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: group.color, fontWeight: 800, fontSize: '0.875rem' }}>
                                {group.icon}
                                {group.level}
                            </div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, background: `${group.color}10`, color: group.color, padding: '0.25rem 0.6rem', borderRadius: '0.5rem' }}>
                                Taux: {group.rate}
                            </div>
                        </div>

                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.75rem' }}>
                            {group.items.map((item, i) => (
                                <li key={i} style={{
                                    fontSize: '0.875rem',
                                    color: '#475569',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.5rem 0',
                                    borderBottom: i === group.items.length - 1 ? 'none' : '1px solid #f1f5f9'
                                }}>
                                    <div style={{ color: group.color, display: 'flex', fontSize: '1rem' }}>
                                        {item.icon}
                                    </div>
                                    {item.label}
                                    {item.critical && <AlertTriangle size={14} color="#ef4444" />}
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};
