import MessagesPage from './MessagesPage';

/* Liste des conversations = même vue split que MessagesPage, sans conversation
   sélectionnée (route /account/messages, sans :userId). */
export default function ConversationsListPage() {
  return <MessagesPage />;
}
