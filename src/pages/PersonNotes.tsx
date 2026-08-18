/**
 * Página PersonNotes - Bloco de notas privado de uma pessoa (Juliano ou Lidiane)
 * Acessível apenas pela própria página da pessoa
 */

import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout, Card, Button } from '../components';
import { useNotes } from '../hooks/useNotes';

const PESSOAS_VALIDAS: Record<string, 'Juliano' | 'Lidiane'> = {
  juliano: 'Juliano',
  lidiane: 'Lidiane',
};

const formatDateTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  const data = new Intl.DateTimeFormat('pt-BR').format(date);
  const hora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date);
  return `${data} às ${hora}`;
};

export const PersonNotes: React.FC = () => {
  const { pessoa } = useParams<{ pessoa: string }>();
  const nomePessoa = pessoa ? PESSOAS_VALIDAS[pessoa.toLowerCase()] : undefined;

  const { notes, loading, error, addNote, removeNote } = useNotes(nomePessoa || 'Juliano');
  const [texto, setTexto] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!nomePessoa) {
    return (
      <Layout navbarTitle="Página não encontrada">
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">Pessoa não encontrada.</p>
          <Link to="/" className="text-blue-600 hover:underline font-medium">
            ← Voltar ao Dashboard
          </Link>
        </div>
      </Layout>
    );
  }

  const handleAdd = async () => {
    if (!texto.trim()) return;
    try {
      setIsSaving(true);
      await addNote(texto.trim());
      setTexto('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await removeNote(id);
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Layout navbarTitle={`Notas de ${nomePessoa}`}>
      <div className="max-w-2xl mx-auto space-y-6">
        <Link
          to={`/gastos/${nomePessoa.toLowerCase()}`}
          className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Voltar para {nomePessoa}
        </Link>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Formulário de nova anotação */}
        <Card title="📝 Nova Anotação">
          <div className="space-y-4">
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escreva sua anotação aqui..."
              rows={4}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none text-base resize-none"
            />
            <Button onClick={handleAdd} disabled={!texto.trim()} isLoading={isSaving}>
              Salvar Anotação
            </Button>
          </div>
        </Card>

        {/* Lista de anotações */}
        <Card title={`📋 Anotações de ${nomePessoa}`}>
          {loading ? (
            <p className="text-center text-gray-600 py-8">Carregando anotações...</p>
          ) : notes.length === 0 ? (
            <p className="text-center text-gray-600 py-8">Nenhuma anotação ainda.</p>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex justify-between items-start gap-4"
                >
                  <div className="flex-1">
                    <p className="text-gray-800 whitespace-pre-wrap break-words">{note.texto}</p>
                    <p className="text-xs text-gray-400 mt-2">{formatDateTime(note.created_at)}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(note.id)}
                    disabled={deletingId === note.id}
                    title="Apagar anotação"
                    className="text-red-500 hover:text-red-700 hover:bg-red-100 p-2 rounded transition-colors disabled:opacity-50 flex-shrink-0"
                  >
                    {deletingId === note.id ? '⏳' : '🗑️'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
};