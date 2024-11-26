import { query, where, orderBy, onSnapshot } from "firebase/firestore";

export const createLoadMessagesFunction = (messageRef, chatroomName, setMessages) => {
  return () => {
    const q = query(
      messageRef,
      where("associatedChatroom", "==", chatroomName),
      orderBy("timestamp", "asc")
    );
    onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({id: doc.id, ...doc.data() })));
    });
  };
};

