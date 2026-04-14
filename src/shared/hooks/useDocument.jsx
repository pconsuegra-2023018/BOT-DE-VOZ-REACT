import reac, { useEffect, useState } from 'react';
import { createDocument, getDocuments, updateDocumentRequest } from '../../services/api';
import toast from 'react-hot-toast';

export const useDocuments= () => {
    const [documents, setDocuments] = useState([]);

    const getAllDocuments = async () => {

        const documentData = await getDocuments();

        if(documentData.error){
            return toast.error('Error fetching documents');
        } 
            setDocuments(documentData.data);
        
    }

    const addDocument = async(
        name,
        documents
    )=>{
        const data={
            name,
            documents
        }

        const productAdd = await createDocument(data);

        if(productAdd.error){
            return toast.error(productAdd?.error?.response?.adata ||
            'Error adding document');
        }

        getAllDocuments();

    }

    const updateDocument = async(
        knowledgeBaseId,
        document,)=>{
        const data={
            knowledgeBaseId,
            document
        }

        const documentUpdate = await updateDocumentRequest(data);

        if(documentUpdate.error){
            return toast.error(documentUpdate?.error?.response?.data ||
            'Error updating document');
        }
        getAllDocuments();
    }

    const deleteDocument = async(documentId) => {
        const documentDelete = await deleteDocumentRequest(documentId);
        if(documentDelete.error){
            return toast.error(documentDelete?.error?.response?.data ||
            'Error deleting document');
        }
        getAllDocuments();
    }

    
    return { 
        documents, 
        getAllDocuments,
        addDocument,
        updateDocument,
        deleteDocument,
        isFetching: !documents.length,
        allDocuments: documents
        };

}